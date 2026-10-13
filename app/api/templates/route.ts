// データの置き場は Supabase（app/kv.ts）。/api/times と同じ仕組み・同じ考え方。
import { kv as redis } from '../../kv';
import { NextResponse } from 'next/server';
import { dbWarn } from '../../dbfail';
import { TEMPLATE_SETS, TEMPLATE_BY_NAME, type TemplateDef } from '../../templates.config';

/* ───────────────────────────────────────────────
   投稿文面（タイトル・本文）の置き場（2026-10-13 新規）

   ★なぜ作ったか
     /times では「どの文面を使うか」を3つから選べるが、**文面の中身は
     店のPCの venrey_templates.json にあり、画面からは直せなかった**。
     文面を変えるたびに、こちらがPCのJSONを手で書き換えていた。
     時刻表で同じ問題を解いた道（画面→Supabase→PCへ配る）がもう在るので、
     文面もそこに乗せる。

   流れ（/api/times と同一）
     ①中村さんが /times で文面を直す → ここに保存
     ②店のPCの times_sync.js が1分おきに GET
     ③venrey_templates.json の該当テンプレの Title / 本文 を書き換える
     ④各botは今までどおりローカルのJSONを読む（bot側は無改造）

   ★テンプレ名（TemplateName）は編集させない。
     あれは「どの枠でどの文面を使うか」の照合キーで、/times の選択や
     eslove_boost.js の突き合わせが**名前の完全一致**で動いている。
     名前を変えられるようにすると、変えた瞬間に全部の枠が迷子になる。
     ＝直せるのは「実際に投稿されるタイトルと本文」だけにする。

   ★保存は鍵なし（/times と同じ理由＝中村さんがスマホから直せることが目的）。
     代わりに ①テンプレは templates.config のホワイトリストのみ
     ②文字数を媒体の上限で検査 ③直前の内容を残して戻せるようにする。
─────────────────────────────────────────────── */

const KEY = 'growup_templates_v1';
const IMPORT_SECRET = process.env.IMPORT_SECRET ?? '';

export type Tpl = { title: string; body: string; updatedAt: number };
type Store = {
  items: Record<string, Tpl>;
  /** 直前の状態（取り消し用）。1テンプレにつき1世代だけ持つ */
  prev: Record<string, Tpl>;
  history: { at: number; name: string }[];
};

const empty = (): Store => ({ items: {}, prev: {}, history: [] });

async function read(): Promise<Store> {
  try {
    const v = await redis.get<Store>(KEY);
    if (!v || typeof v !== 'object') return empty();
    return { items: v.items ?? {}, prev: v.prev ?? {}, history: v.history ?? [] };
  } catch (e) {
    /* 読めないのを『文面が空』と取り違えないよう理由を残す（/api/times と同じ事故を防ぐ） */
    dbWarn('templates.read', e);
    return empty();
  }
}
async function write(s: Store): Promise<boolean> {
  try { await redis.set(KEY, JSON.stringify(s)); return true; }
  catch (e) { dbWarn('templates.write', e); return false; }
}

/** 受け取った文面を検査して整える。だめなら理由を返す。 */
function clean(def: TemplateDef, rawTitle: unknown, rawBody: unknown):
  { ok: true; title: string; body: string } | { ok: false; error: string } {
  /* 改行コードはCRLFで来ることがある。媒体のtextareaはLFなので揃える
     （揃えないと、見た目が同じなのに毎回「変更あり」と判定されて書き戻しが止まらない）。 */
  const title = String(rawTitle ?? '').replace(/\r\n/g, '\n').trim();
  const body = String(rawBody ?? '').replace(/\r\n/g, '\n');

  if (!title) return { ok: false, error: 'タイトルが空です' };
  if (!body.trim()) return { ok: false, error: '本文が空です' };
  if (title.length > def.titleMax) {
    return { ok: false, error: `タイトルは${def.titleMax}文字までです（いま${title.length}文字）` };
  }
  if (body.length > def.bodyMax) {
    return { ok: false, error: `本文は${def.bodyMax}文字までです（いま${body.length}文字）` };
  }
  return { ok: true, title, body };
}

/** 画面・PCの両方がこれを読む */
export async function GET() {
  const store = await read();
  const sets = TEMPLATE_SETS.map((set) => ({
    id: set.id,
    name: set.name,
    desc: set.desc,
    titleMax: set.titleMax,
    bodyMax: set.bodyMax,
    photoHint: set.photoHint ?? '',
    templates: set.templates.map((name) => ({
      name,
      // 未登録＝まだ店のPCから種を貰っていない。PC側はこれを見て今のJSONを送ってくる
      title: store.items[name]?.title ?? null,
      body: store.items[name]?.body ?? null,
      updatedAt: store.items[name]?.updatedAt ?? null,
      canUndo: Boolean(store.prev[name]),
    })),
  }));
  return NextResponse.json({ sets, now: Date.now() });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action ?? 'save');
  const store = await read();
  const now = Date.now();

  // ── ① 画面から：保存する（鍵なし）─────────────
  if (action === 'save') {
    const name = String(b.name ?? '');
    const def = TEMPLATE_BY_NAME.get(name);
    if (!def) return NextResponse.json({ ok: false, error: 'その文面は編集できません' }, { status: 400 });

    const res = clean(def, b.title, b.body);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });

    if (store.items[name]) store.prev[name] = store.items[name];
    store.items[name] = { title: res.title, body: res.body, updatedAt: now };
    store.history = [{ at: now, name }, ...store.history].slice(0, 50);

    if (!(await write(store))) {
      return NextResponse.json({ ok: false, error: '保存できませんでした（通信エラー）' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, title: res.title, body: res.body, updatedAt: now });
  }

  // ── ② 画面から：直前に戻す（鍵なし）─────────────
  if (action === 'undo') {
    const name = String(b.name ?? '');
    const back = store.prev[name];
    if (!TEMPLATE_BY_NAME.has(name) || !back) {
      return NextResponse.json({ ok: false, error: '戻せる内容がありません' }, { status: 400 });
    }
    store.prev[name] = store.items[name];
    store.items[name] = { ...back, updatedAt: now };
    if (!(await write(store))) {
      return NextResponse.json({ ok: false, error: '保存できませんでした（通信エラー）' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, title: back.title, body: back.body });
  }

  // ここから下は店のPC（times_sync.js）専用
  if (!IMPORT_SECRET || b.secret !== IMPORT_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // ── ③ PCから：いま実際に使っている文面を種として登録する ─────────────
  //    force=true でないと既存は上書きしない（画面での編集を潰さないため）
  if (action === 'seed') {
    const force = b.force === true;
    const seeds = (b.items ?? {}) as Record<string, { title?: unknown; body?: unknown }>;
    const added: string[] = [];
    for (const [name, v] of Object.entries(seeds)) {
      const def = TEMPLATE_BY_NAME.get(name);
      if (!def) continue;
      if (store.items[name] && !force) continue;
      const res = clean(def, v?.title, v?.body);
      if (!res.ok) continue;
      store.items[name] = { title: res.title, body: res.body, updatedAt: now };
      added.push(name);
    }
    if (added.length && !(await write(store))) {
      return NextResponse.json({ ok: false, error: 'DBに書けません' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, added });
  }

  return NextResponse.json({ ok: false, error: '不明な操作です' }, { status: 400 });
}
