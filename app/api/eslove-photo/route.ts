import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

/* ───────────────────────────────────────────────
   エステラブ 新着情報の写真差し替え（2026-08-08 新規）

   なぜ /api/jobs に相乗りしないか：
     jobs は「押すだけ（引数は名前1個まで）」の作り。写真は数百KBのデータを
     店のPCまで運ぶ必要があるので、別の受け口にした。

   流れ
     ①店のPCの eslove_photo.js --list が投稿5件を publish（鍵あり）
     ②中村さんが /photos で写真を選ぶ → set（鍵なし・スマホから押せる）
        ★ブラウザ側で600×800のjpgに縮めてから送る（Redisに載る大きさにするため）
     ③店のPCの runner.js が claim（鍵あり）→ 差し替え → report（鍵あり）

   ★鍵なしで受けるのは set だけ。しかも「差し替え待ち」を1件しか持たない＝
     連打されても溜まらない。実際に書き込むのは店のPCの中だけ。
─────────────────────────────────────────────── */

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

const POSTS_KEY = 'eslove_feed_posts_v1';   // 投稿5件の一覧（店のPCが publish）
const PEND_KEY = 'eslove_photo_pending_v1'; // 差し替え待ち（1件だけ）
const IMPORT_SECRET = process.env.IMPORT_SECRET ?? '';

/** 画像1枚の上限。600×800のjpgなら普通150KB以下、base64で約200KB。
    Upstashの1値1MBに収まるよう、余裕を持って700KBで切る。 */
const MAX_IMAGE_B64 = 700 * 1024;

type Post = { slot: number; id: string; title: string; photo: string; category?: string };
type Pending = {
  slot: number;
  title: string;
  /** data URLではなく生のbase64（jpg） */
  imageB64: string;
  at: number;
  status: 'queued' | 'running';
  startedAt?: number;
};
type Result = { at: number; ok: boolean; message: string; slot: number };

/** 拾われないまま放置された差し替え待ちの時効 */
const STALE_QUEUED_MS = 10 * 60 * 1000;
/** runnerが拾ったまま応答しない場合の時効（写真1枚＝常駐停止込みで最大8分見る） */
const STALE_RUNNING_MS = 10 * 60 * 1000;

async function readPending(): Promise<Pending | null> {
  try {
    const v = await redis.get<Pending>(PEND_KEY);
    if (!v || typeof v !== 'object') return null;
    const now = Date.now();
    if (v.status === 'queued' && now - v.at > STALE_QUEUED_MS) { await redis.del(PEND_KEY); return null; }
    if (v.status === 'running' && now - (v.startedAt ?? 0) > STALE_RUNNING_MS) { await redis.del(PEND_KEY); return null; }
    return v;
  } catch { return null; }
}

/** 画面用：投稿一覧＋いま差し替え待ちがあるか＋前回の結果 */
export async function GET() {
  const [posts, pending, result] = await Promise.all([
    redis.get<{ at: number; posts: Post[] }>(POSTS_KEY).catch(() => null),
    readPending(),
    redis.get<Result>('eslove_photo_result_v1').catch(() => null),
  ]);
  return NextResponse.json({
    posts: posts?.posts ?? [],
    postsAt: posts?.at ?? null,
    /* 画像そのものは返さない（重いので）。待ちがあるかどうかだけ。 */
    pending: pending ? { slot: pending.slot, title: pending.title, status: pending.status, at: pending.at } : null,
    result: result ?? null,
    now: Date.now(),
  });
}

export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(b.action ?? '');

  // ── ① 画面から：この投稿の写真をこれに替えて（鍵なし）─────────
  if (action === 'set') {
    const slot = Number(b.slot ?? 0);
    const imageB64 = String(b.imageB64 ?? '');
    if (!Number.isInteger(slot) || slot < 1 || slot > 5) {
      return NextResponse.json({ ok: false, error: '投稿の指定が正しくありません' }, { status: 400 });
    }
    if (!imageB64) return NextResponse.json({ ok: false, error: '画像がありません' }, { status: 400 });
    if (imageB64.length > MAX_IMAGE_B64) {
      return NextResponse.json({ ok: false, error: '画像が大きすぎます。もう一度選び直してください' }, { status: 413 });
    }
    /* base64以外の文字が混ざっていたら受けない（data URLの前置きを剥がし忘れ等） */
    if (!/^[A-Za-z0-9+/=]+$/.test(imageB64)) {
      return NextResponse.json({ ok: false, error: '画像の形式が正しくありません' }, { status: 400 });
    }
    const already = await readPending();
    if (already) {
      return NextResponse.json(
        { ok: false, error: 'いま別の写真を差し替え中です。終わるまでお待ちください' },
        { status: 409 },
      );
    }
    const posts = await redis.get<{ posts: Post[] }>(POSTS_KEY).catch(() => null);
    const title = posts?.posts?.find((p) => p.slot === slot)?.title ?? `${slot}番目の投稿`;
    const pend: Pending = { slot, title, imageB64, at: Date.now(), status: 'queued' };
    try { await redis.set(PEND_KEY, JSON.stringify(pend)); }
    catch { return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 }); }
    return NextResponse.json({ ok: true, status: 'queued' });
  }

  // ここから下は店のPC（runner.js / eslove_photo.js）専用
  if (!IMPORT_SECRET || b.secret !== IMPORT_SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // ── ② 店のPCから：投稿5件の一覧を登録する ─────────
  if (action === 'publish') {
    const posts = Array.isArray(b.posts) ? (b.posts as Post[]) : null;
    if (!posts) return NextResponse.json({ ok: false, error: 'posts がありません' }, { status: 400 });
    await redis.set(POSTS_KEY, JSON.stringify({ at: Date.now(), posts: posts.slice(0, 5) }));
    return NextResponse.json({ ok: true, count: Math.min(posts.length, 5) });
  }

  // ── ③ 店のPCから：差し替え待ちを1件もらう ─────────
  if (action === 'claim') {
    const pend = await readPending();
    if (!pend || pend.status !== 'queued') return NextResponse.json({ ok: true, job: null });
    pend.status = 'running';
    pend.startedAt = Date.now();
    await redis.set(PEND_KEY, JSON.stringify(pend));
    return NextResponse.json({ ok: true, job: { slot: pend.slot, title: pend.title, imageB64: pend.imageB64 } });
  }

  // ── ④ 店のPCから：結果を返す ─────────
  if (action === 'report') {
    const slot = Number(b.slot ?? 0);
    const result: Result = {
      at: Date.now(),
      ok: Boolean(b.ok),
      message: String(b.message ?? '').slice(0, 300),
      slot,
    };
    await redis.set('eslove_photo_result_v1', JSON.stringify(result));
    await redis.del(PEND_KEY);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: '不明な操作です' }, { status: 400 });
}
