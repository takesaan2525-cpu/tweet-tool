import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { TIMES_CONTENTS, TIMES_BY_ID, MAX_SLOTS, type TimesContent } from '../../times.config';

/* ───────────────────────────────────────────────
   投稿時刻表の置き場（/times ページの受け口）

   ここが唯一の正本。店のPCの scraper/times_sync.js が1分おきに GET して
   scraper/ 配下の時刻表JSONに書き戻す。各botはローカルJSONを読むだけなので、
   ここが落ちても最後に届いた時刻表でそのまま回り続ける。

   ★保存は鍵なし（ユーザー判断：中村さんがスマホから直せることが今回の目的）。
     代わりに ①コンテンツは times.config のホワイトリストのみ ②時刻の形式と
     件数上限を厳格に検査 ③直前の内容を history に残して戻せるようにする。
─────────────────────────────────────────────── */

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

const KEY = 'growup_times_v1';
const IMPORT_SECRET = process.env.IMPORT_SECRET ?? '';

/** 1枠＝時刻と、（文面を選ぶコンテンツなら）どの文面か */
export type Slot = { time: string; choice?: string };
type Entry = { slots: Slot[]; updatedAt: number };
type Store = {
  contents: Record<string, Entry>;
  /** 直前の状態（取り消し用）。1コンテンツにつき1世代だけ持つ */
  prev: Record<string, Entry>;
  history: { at: number; id: string; count: number }[];
};

const empty = (): Store => ({ contents: {}, prev: {}, history: [] });

async function read(): Promise<Store> {
  try {
    const v = await redis.get<Store>(KEY);
    if (!v || typeof v !== 'object') return empty();
    return { contents: v.contents ?? {}, prev: v.prev ?? {}, history: v.history ?? [] };
  } catch {
    return empty();
  }
}
async function write(s: Store): Promise<boolean> {
  try { await redis.set(KEY, JSON.stringify(s)); return true; } catch { return false; }
}

const isTime = (t: unknown): t is string =>
  typeof t === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(t);

/** "9:05" → "09:05" に揃える（PC側の突き合わせが文字列一致なので必須） */
const pad = (t: string) => {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m}`;
};

/** 受け取った枠を検査して整える。だめなら理由を返す */
function clean(def: TimesContent, raw: unknown): { ok: true; slots: Slot[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: '時刻の並びが読めませんでした' };
  const cap = Math.min(def.dailyCap ?? MAX_SLOTS, MAX_SLOTS);
  const out: Slot[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const t = (r as Slot)?.time;
    if (!isTime(t)) return { ok: false, error: `「${String(t ?? '')}」は時刻として読めません（例 21:30）` };
    const time = pad(t);
    if (seen.has(time)) return { ok: false, error: `${time} が2つあります。同じ時刻は1つにしてください` };
    seen.add(time);

    let choice: string | undefined;
    if (def.choices.length) {
      const c = String((r as Slot)?.choice ?? '');
      if (!def.choices.some((x) => x.value === c)) {
        return { ok: false, error: `${time} の内容が選ばれていません` };
      }
      choice = c;
    }
    out.push(choice === undefined ? { time } : { time, choice });
  }
  if (out.length > cap) {
    return { ok: false, error: `この媒体は1日${cap}回までです（いま${out.length}件）` };
  }
  out.sort((a, b) => a.time.localeCompare(b.time));
  return { ok: true, slots: out };
}

/** 画面・PCの両方がこれを読む */
export async function GET() {
  const store = await read();
  const contents = TIMES_CONTENTS.map((d) => ({
    id: d.id,
    name: d.name,
    desc: d.desc,
    file: d.file,
    shape: d.shape,
    resetHour: d.resetHour,
    dailyCap: d.dailyCap ?? null,
    choices: d.choices,
    note: d.note ?? '',
    // 未登録＝まだ店のPCから種を貰っていない。PC側はこれを見て今のJSONを送ってくる
    slots: store.contents[d.id]?.slots ?? null,
    updatedAt: store.contents[d.id]?.updatedAt ?? null,
    canUndo: Boolean(store.prev[d.id]),
  }));
  return NextResponse.json({ contents, now: Date.now() });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action ?? 'save');
  const store = await read();
  const now = Date.now();

  // ── ① 画面から：保存する（鍵なし）─────────────
  if (action === 'save') {
    const id = String(b.id ?? '');
    const def = TIMES_BY_ID.get(id);
    if (!def) return NextResponse.json({ ok: false, error: 'その項目は編集できません' }, { status: 400 });

    const res = clean(def, b.slots);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });

    if (store.contents[id]) store.prev[id] = store.contents[id];
    store.contents[id] = { slots: res.slots, updatedAt: now };
    store.history = [{ at: now, id, count: res.slots.length }, ...store.history].slice(0, 50);

    if (!(await write(store))) {
      return NextResponse.json({ ok: false, error: '保存できませんでした（通信エラー）' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, slots: res.slots, updatedAt: now });
  }

  // ── ② 画面から：直前に戻す（鍵なし）─────────────
  if (action === 'undo') {
    const id = String(b.id ?? '');
    const def = TIMES_BY_ID.get(id);
    const back = store.prev[id];
    if (!def || !back) return NextResponse.json({ ok: false, error: '戻せる内容がありません' }, { status: 400 });
    store.prev[id] = store.contents[id];
    store.contents[id] = { ...back, updatedAt: now };
    if (!(await write(store))) {
      return NextResponse.json({ ok: false, error: '保存できませんでした（通信エラー）' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, slots: back.slots });
  }

  // ここから下は店のPC（times_sync.js）専用
  if (!IMPORT_SECRET || b.secret !== IMPORT_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // ── ③ PCから：いま実際に動いている時刻表を種として登録する ─────────────
  //    force=true でないと既存は上書きしない（画面での編集を潰さないため）
  if (action === 'seed') {
    const force = b.force === true;
    const seeds = (b.contents ?? {}) as Record<string, unknown>;
    const added: string[] = [];
    for (const def of TIMES_CONTENTS) {
      if (!(def.id in seeds)) continue;
      if (store.contents[def.id] && !force) continue;
      const res = clean(def, seeds[def.id]);
      if (!res.ok) continue;
      store.contents[def.id] = { slots: res.slots, updatedAt: now };
      added.push(def.id);
    }
    if (added.length && !(await write(store))) {
      return NextResponse.json({ ok: false, error: 'DBに書けません' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, added });
  }

  return NextResponse.json({ ok: false, error: '不明な操作です' }, { status: 400 });
}
