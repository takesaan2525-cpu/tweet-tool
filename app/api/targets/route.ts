import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

const KEY = 'growup_targets';

export async function GET() {
  const data = await redis.get<unknown[]>(KEY);
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body = await req.json();
  await redis.set(KEY, JSON.stringify(body));
  return NextResponse.json({ ok: true });
}
