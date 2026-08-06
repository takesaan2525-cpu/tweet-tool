import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { CASTS, type Cast } from '../line-webhook/casts';

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

// キャスト一覧をまるごとDBで管理（お店が /staff から追加・編集・削除できる）
const LIST_KEY = 'growup_casts';
// 旧：出勤/LINEだけの上書き（移行用に一度だけ取り込む）
const OVERRIDE_KEY = 'growup_cast_overrides';

const newId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// 初回シード：コードの初期キャスト ＋ 旧上書き を取り込んで一覧を作る
async function seed(): Promise<Cast[]> {
  let ov: Record<string, { today?: boolean; lineUserId?: string }> = {};
  try { ov = (await redis.get(OVERRIDE_KEY)) ?? {}; } catch { /* noop */ }
  return CASTS.map((c) => ({
    ...c,
    id: newId(),
    today: ov[c.name]?.today ?? c.today,
    lineUserId: ov[c.name]?.lineUserId ?? c.lineUserId ?? '',
  }));
}

// 現在のキャスト一覧（DB優先。無ければシードして保存）
export async function getCasts(): Promise<Cast[]> {
  try {
    const list = await redis.get<Cast[]>(LIST_KEY);
    if (Array.isArray(list) && list.length) return list;
    const seeded = await seed();
    await redis.set(LIST_KEY, JSON.stringify(seeded));
    return seeded;
  } catch {
    // Redis未設定/障害時は初期データで動かす
    return CASTS.map((c) => ({ ...c, id: c.id ?? c.name, lineUserId: c.lineUserId ?? '' }));
  }
}

// 予約通知などから使う既存名（後方互換）
export const getMergedCasts = getCasts;

async function save(list: Cast[]) {
  await redis.set(LIST_KEY, JSON.stringify(list));
}

// ローカルのスクレイパーから送られてくる在籍データの型
type Scraped = { name: string; age: number; height: number; cup: string; photo: string };
// 取り込みAPIの認証（環境変数 IMPORT_SECRET と一致が必要）。未設定なら取り込み自体を拒否。
const IMPORT_SECRET = process.env.IMPORT_SECRET ?? '';
// 管理操作（追加/編集/削除/LINE紐付け）は /gate で発行されるCookieが必要
const ADMIN_KEY = process.env.ADMIN_KEY ?? '';
function isAdmin(req: Request): boolean {
  if (!ADMIN_KEY) return false;
  const cookies = req.headers.get('cookie') ?? '';
  return cookies.split(/;\s*/).some((c) => c === `gk=${ADMIN_KEY}`);
}

export async function GET() {
  return NextResponse.json(await getCasts());
}

// 入力値を安全に1キャスト分へ整形
function sanitize(b: Record<string, unknown>, base?: Cast): Cast {
  const s = (v: unknown, d = '') => (typeof v === 'string' ? v : v == null ? d : String(v));
  const n = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
  return {
    id: base?.id ?? newId(),
    name: s(b.name, base?.name ?? ''),
    age: n(b.age, base?.age ?? 0),
    height: n(b.height, base?.height ?? 0),
    cup: s(b.cup, base?.cup ?? ''),
    type: s(b.type, base?.type ?? ''),
    comment: s(b.comment, base?.comment ?? ''),
    hours: s(b.hours, base?.hours ?? ''),
    photo: s(b.photo, base?.photo ?? ''),
    today: typeof b.today === 'boolean' ? b.today : (base?.today ?? false),
    // ★週間出勤は編集フォームから送られてこない。ここで base から引き継がないと
    //   /staff でプロフィールを1文字直しただけで週間出勤が消える（作り直し関数のため）。
    schedule: isSchedule(b.schedule) ? b.schedule : base?.schedule,
    lineUserId: s(b.lineUserId, base?.lineUserId ?? ''),
  };
}

// schedule が {'YYYY-MM-DD': '時間'} の形かを確かめる（壊れた値を保存しない）
function isSchedule(v: unknown): v is Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  return Object.entries(v as Record<string, unknown>)
    .every(([k, val]) => /^\d{4}-\d{2}-\d{2}$/.test(k) && typeof val === 'string');
}

// 追加 / 編集 / 削除。action 省略時は従来どおり「1キャストの部分更新」
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const action = String(b?.action ?? 'update');
  const list = await getCasts();

  // 取り込み系（ローカルのスクレイパーから）：秘密キー必須。未設定なら拒否。
  if (action === 'importData' || action === 'syncAttendance') {
    if (!IMPORT_SECRET || b?.secret !== IMPORT_SECRET) {
      return NextResponse.json({ ok: false, error: '認証エラー' }, { status: 401 });
    }
  } else if (!isAdmin(req)) {
    // それ以外（追加/編集/削除/LINE紐付け）は管理Cookie必須
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (action === 'importData') {
    const roster: Scraped[] = Array.isArray(b?.casts) ? b.casts : [];
    if (!roster.length) return NextResponse.json({ ok: false, error: 'データが空です' }, { status: 400 });
    let added = 0, updated = 0;
    for (const s of roster) {
      const ex = list.find((c) => c.name === s.name);
      if (ex) {
        // 既存：写真・年齢・身長・カップだけ最新化。出勤/LINE/タイプ/時間は維持
        ex.age = s.age; ex.height = s.height; ex.cup = s.cup;
        if (s.photo) ex.photo = s.photo;
        updated++;
      } else {
        list.push({ id: newId(), name: s.name, age: s.age, height: s.height, cup: s.cup, type: '', comment: '', hours: '', photo: s.photo, today: false, lineUserId: '' });
        added++;
      }
    }
    try { await save(list); } catch { return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 }); }
    return NextResponse.json({ ok: true, added, updated, total: list.length });
  }

  // エステラブの出勤情報から「本日の出勤」を同期する。
  // working=[{name, hours}] に載っている子だけ today=true(＋hours更新)、他は today=false。
  if (action === 'syncAttendance') {
    const working: { name: string; hours?: string }[] = Array.isArray(b?.working) ? b.working : [];
    const norm = (s: string) => String(s ?? '').replace(/\s+/g, '').trim();
    const map = new Map(working.map((w) => [norm(w.name), w.hours ?? '']));
    const seen = new Set<string>();
    let on = 0, off = 0, added = 0;
    for (const c of list) {
      const key = norm(c.name);
      const hit = map.get(key);
      if (hit !== undefined) { c.today = true; if (hit) c.hours = hit; on++; seen.add(key); }
      else { c.today = false; off++; }
    }
    // 名簿に無い出勤者は自動登録（新人セラピストがHPに載れば手動登録なしで全媒体に反映）。
    // 出勤しない日は上のループで today=false になる＝自己クリーニング。
    for (const w of working) {
      const key = norm(w.name);
      if (!key || seen.has(key)) continue;
      list.push({ id: newId(), name: w.name, age: 0, height: 0, cup: '', type: '', comment: '', hours: w.hours ?? '', photo: '', today: true, lineUserId: '' });
      seen.add(key); on++; added++;
    }

    // ── 週間出勤（任意）。days=[{date:'YYYY-MM-DD', working:[{name,hours}]}]
    //    送られてきた日付ぶんだけ書き換える（届いていない日は触らない）。
    //    ★当日ぶんの today/hours は上のループが正。ここでは一切上書きしない。
    const rawDays: { date?: string; working?: { name: string; hours?: string }[] }[] =
      Array.isArray(b?.days) ? b.days : [];
    const days = rawDays.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d?.date ?? '')));
    const unknown = new Set<string>();
    if (days.length) {
      // 届いた日付のうち一番古い日より前は捨てる（際限なく溜まるのを防ぐ）
      const oldest = days.map((d) => String(d.date)).sort()[0];
      const byDate = days.map((d) => ({
        date: String(d.date),
        map: new Map((Array.isArray(d.working) ? d.working : []).map((w) => [norm(w.name), w.hours ?? ''])),
      }));
      const known = new Set(list.map((c) => norm(c.name)));
      for (const d of byDate) for (const k of d.map.keys()) if (!known.has(k)) unknown.add(k);

      for (const c of list) {
        const key = norm(c.name);
        const sc: Record<string, string> = {};
        for (const [k, v] of Object.entries(c.schedule ?? {})) if (k >= oldest) sc[k] = v;
        for (const d of byDate) {
          const hit = d.map.get(key);
          if (hit !== undefined) sc[d.date] = hit; // 出勤（時間が読めなければ空文字）
          else delete sc[d.date];                  // 休み＝キーごと消す
        }
        c.schedule = sc;
      }
    }

    try { await save(list); } catch { return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 }); }
    return NextResponse.json({
      ok: true, on, off, added, working: working.map((w) => w.name),
      // 週間ぶんに出てくるが名簿にいない子は、勝手に作らず報告だけする
      // （当日ぶんの自動登録と違い、先の日付は打ち間違いが混ざっても気づけないため）
      days: days.length, unknown: [...unknown],
    });
  }

  if (action === 'add') {
    if (!b?.name) return NextResponse.json({ ok: false, error: '名前は必須です' }, { status: 400 });
    const cast = sanitize(b);
    list.push(cast);
    try { await save(list); } catch { return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 }); }
    return NextResponse.json({ ok: true, cast });
  }

  if (action === 'delete') {
    const id = String(b?.id ?? '');
    const next = list.filter((c) => c.id !== id);
    if (next.length === list.length) return NextResponse.json({ ok: false, error: '対象が見つかりません' }, { status: 400 });
    try { await save(next); } catch { return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 }); }
    return NextResponse.json({ ok: true });
  }

  // update：id 優先、無ければ name で対象を探して部分更新
  const idx = b?.id
    ? list.findIndex((c) => c.id === b.id)
    : list.findIndex((c) => c.name === b?.name);
  if (idx < 0) return NextResponse.json({ ok: false, error: '対象が見つかりません' }, { status: 400 });
  const cur = list[idx];
  // 渡されたフィールドだけ反映
  if (typeof b.today === 'boolean') cur.today = b.today;
  if (typeof b.lineUserId === 'string') cur.lineUserId = b.lineUserId;
  if (b.fields && typeof b.fields === 'object') {
    list[idx] = sanitize({ ...cur, ...b.fields }, cur);
  } else {
    list[idx] = cur;
  }
  try { await save(list); } catch { return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 }); }
  return NextResponse.json({ ok: true, cast: list[idx] });
}
