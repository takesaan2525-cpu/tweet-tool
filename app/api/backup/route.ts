import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

// 毎日バックアップする対象キー
const KEYS = ['growup_reservations', 'growup_casts', 'growup_line_users', 'growup_sites'];
// バックアップの保持日数（この日数を過ぎたスナップショットは自動で消える）
const KEEP_DAYS = 8;

// Vercel Cron から毎日呼ばれ、全データを日付き キー(bk:YYYY-MM-DD)へ退避する。
// CRON_SECRET を設定すると Vercel Cron が Authorization: Bearer <secret> を付けて呼ぶ＝それ以外は拒否。
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? '';
  const auth = req.headers.get('authorization') ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const snap: Record<string, unknown> = {};
  for (const k of KEYS) snap[k] = await redis.get(k);

  // JST日付でキー名を作る（Vercel CronはUTCなので+9時間）
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const date = jst.toISOString().slice(0, 10);
  const key = `bk:${date}`;

  await redis.set(
    key,
    JSON.stringify({ at: new Date().toISOString(), data: snap }),
    { ex: KEEP_DAYS * 24 * 60 * 60 }, // 保持日数を過ぎたら自動失効
  );

  const counts = Object.fromEntries(
    KEYS.map((k) => [k, Array.isArray(snap[k]) ? (snap[k] as unknown[]).length : snap[k] ? 1 : 0]),
  );
  return NextResponse.json({ ok: true, key, counts });
}
