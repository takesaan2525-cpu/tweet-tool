import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

const KEY = 'growup_sites';
// 掲載bot連携の簡易認証（ローカルのrun_all.jsが last 更新時に使う）
const IMPORT_SECRET = process.env.IMPORT_SECRET ?? '';

export type Site = { id: string; name: string; auto: boolean; last: string };

// 既定：全部OFF（スイッチONにするまで何も実行しない）
// ※ estama（旧ワンクリックアピール）は時間ズレで廃止 → estama_realtime（10分ごと再投稿）に置き換え
const DEFAULT: Site[] = [
  { id: 'eslove', name: 'エステラブ', auto: false, last: '—' },
  { id: 'cocoa', name: 'ココア', auto: false, last: '—' },
  { id: 'deki', name: '駅ちか', auto: false, last: '—' },
  { id: 'estama_realtime', name: 'エス魂（10分自動投稿）', auto: false, last: '—' },
];

async function getSites(): Promise<Site[]> {
  try {
    const list = await redis.get<Site[]>(KEY);
    if (Array.isArray(list) && list.length) {
      // 新しい既定サイトが増えていたらマージ
      const byId = new Map(list.map((s) => [s.id, s]));
      return DEFAULT.map((d) => byId.get(d.id) ?? d);
    }
    await redis.set(KEY, JSON.stringify(DEFAULT));
    return DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export async function GET() {
  return NextResponse.json(await getSites());
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const list = await getSites();

  // ローカルbotからの「最終実行時刻」報告（secret必須）
  if (b?.action === 'reportRun') {
    if (IMPORT_SECRET && b?.secret !== IMPORT_SECRET) {
      return NextResponse.json({ ok: false, error: '認証エラー' }, { status: 401 });
    }
    const id = String(b?.id ?? '');
    const s = list.find((x) => x.id === id);
    if (s) { s.last = String(b?.last ?? new Date().toLocaleString('ja-JP')); }
    try { await redis.set(KEY, JSON.stringify(list)); } catch { /* noop */ }
    return NextResponse.json({ ok: true });
  }

  // ダッシュボードからのON/OFF切替
  const id = String(b?.id ?? '');
  const s = list.find((x) => x.id === id);
  if (!s) return NextResponse.json({ ok: false, error: '対象が見つかりません' }, { status: 400 });
  if (typeof b.auto === 'boolean') s.auto = b.auto;
  try { await redis.set(KEY, JSON.stringify(list)); }
  catch { return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 }); }
  return NextResponse.json({ ok: true, site: s });
}
