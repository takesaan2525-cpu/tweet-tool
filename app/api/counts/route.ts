import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { COUNTERS, COUNTER_BY_ID, isFresh } from '../../counts.config';

/* ───────────────────────────────────────────────
   本日の残り回数の置き場（ボタン横の「残り 24/40」の元）

   書き込むのは店のPCの scraper/read_counts.js だけ（IMPORT_SECRET 必須）。
   read_counts.js は各媒体に「ログインして読むだけ」で、投稿も上位化もしない。

   読み取りは鍵なし＝/status（中村さん用）と /dashboard の両方から見える。
   回数は媒体の管理画面に出ている数字と同じもので、秘密ではない。

   ★ここが落ちても実害はない：数字が出なくなるだけで、botは自分で
     残り回数を読んでから撃つ（0なら撃たない）ので二重の歯止めになっている。
─────────────────────────────────────────────── */

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

const KEY = 'growup_counts_v1';
const IMPORT_SECRET = process.env.IMPORT_SECRET ?? '';

type Entry = {
  /** 残り回数。null＝読めなかった（ページ構造が変わった等） */
  remaining: number | null;
  readAt: number;
};
type Store = Record<string, Entry>;

async function read(): Promise<Store> {
  try {
    const v = await redis.get<Store>(KEY);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export async function GET() {
  const store = await read();
  const now = Date.now();
  const counters = COUNTERS.map((d) => {
    const e = store[d.id];
    const remaining = e?.remaining ?? null;
    const readAt = e?.readAt ?? 0;
    const fresh = remaining !== null && isFresh(readAt, d.resetHour, now);
    return {
      id: d.id,
      label: d.label,
      jobId: d.jobId,
      dailyCap: d.dailyCap,
      remaining,
      readAt: readAt || null,
      /** 数字がいま信用できるか。false のときはボタンを閉めない（古い0で締め出さない） */
      fresh,
      /** 「今日はもう撃てない」と言い切れるか＝新しい数字で0のときだけ */
      exhausted: fresh && remaining === 0,
    };
  });
  return NextResponse.json({ counters, now });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // 書き込みは店のPC専用
  if (!IMPORT_SECRET || b.secret !== IMPORT_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (String(b.action ?? 'report') !== 'report') {
    return NextResponse.json({ ok: false, error: '不明な操作です' }, { status: 400 });
  }

  const store = await read();
  const now = Date.now();
  const saved: string[] = [];

  /* counts = { deki_joui: 24, rank_news: 0, … }
     知らない id と、数字として読めない値は黙って捨てる（ホワイトリスト方式）。
     ★「読めなかった」を残り0として保存しないこと。0はボタンを閉めるので、
       読み取り失敗を0にすると押せるはずのボタンが押せなくなる。 */
  const counts = (b.counts ?? {}) as Record<string, unknown>;
  for (const [id, raw] of Object.entries(counts)) {
    const def = COUNTER_BY_ID.get(id);
    if (!def) continue;
    if (raw === null || raw === undefined || raw === '') continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 999) continue;
    store[id] = { remaining: n, readAt: now };
    saved.push(id);
  }

  if (saved.length) {
    try {
      await redis.set(KEY, JSON.stringify(store));
    } catch {
      return NextResponse.json({ ok: false, error: 'DBに書けません' }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, saved });
}
