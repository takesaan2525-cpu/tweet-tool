import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import { SITES_DEFAULT } from '../../shop.config';

const redis = new Redis({
  url: (process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL)!,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN)!,
});

// v2: 掲載トグルの既定値を刷新（駅ちか・エステラブ・MAP・エス魂をON）。
// 旧キー growup_sites の stale な auto:false を引き継がないよう新キーで再シードする。
/* v3：ココア/リフナビ/じゃぱんを『準備中』から稼働中に変えたとき、旧キーに残っていた
   auto:false（準備中時代の保存値）が merge で勝ってOFF表示になるため、新キーで再シードする。 */
const KEY = 'growup_sites_v3';
// 掲載bot連携の認証（ローカルの掲載botが last 更新時に使う）
const IMPORT_SECRET = process.env.IMPORT_SECRET ?? '';
// ダッシュボードからのON/OFF切替は管理者Cookie(/gateで発行)必須
const ADMIN_KEY = process.env.ADMIN_KEY ?? '';
function isAdmin(req: Request): boolean {
  if (!ADMIN_KEY) return false;
  const cookies = req.headers.get('cookie') ?? '';
  return cookies.split(/;\s*/).some((c) => c === `gk=${ADMIN_KEY}`);
}

/* ready:false のサイトは自動投稿の実装がまだ無い＝「準備中」。ONに切り替えできない。
   pauseUntil＝「この時刻まで自動を止める」（ミリ秒）。中村さんが自分で管理画面を
   触る間だけボットを黙らせるために使う。時刻を過ぎたら勝手に元へ戻る。
   ★エステラブは1アカウント1ログイン制で、ボットが2分おきにログインを握っている。
     止めずに人が入ると取り合いになり、普通に使っているだけで障害通知が飛ぶ。 */
export type Site = { id: string; name: string; auto: boolean; last: string; ready?: boolean; pauseUntil?: number; soloLogin?: boolean };

// 既定サイトは店舗マスタ(shop.config)に集約。ready:true=自動投稿の実体あり。
const DEFAULT: Site[] = SITES_DEFAULT;

/* 保存されている生の値。auto は「中村さんが設定したON/OFF」そのもので、
   一時停止中でも書き換えない（停止が明けたら元の設定に戻すため）。 */
async function getSites(): Promise<Site[]> {
  try {
    const list = await redis.get<Site[]>(KEY);
    if (Array.isArray(list) && list.length) {
      // name/ready はコード(DEFAULT)を正とし、auto/last/pauseUntil は保存値を引き継ぐ
      const byId = new Map(list.map((s) => [s.id, s]));
      return DEFAULT.map((d) => {
        const saved = byId.get(d.id);
        return {
          ...d,
          auto: d.ready ? (saved?.auto ?? d.auto) : false,
          last: saved?.last ?? d.last,
          ...(saved?.pauseUntil ? { pauseUntil: saved.pauseUntil } : {}),
        };
      });
    }
    await redis.set(KEY, JSON.stringify(DEFAULT));
    return DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/* 外に見せる形＝一時停止中なら auto を false にして返す。
   ★ローカルbotの siteEnabled() はこの auto だけを見るので、
     これだけで「止まっている間はログインもしない」が成立する。
   ★期限切れの pauseUntil は落として返す（勝手に復帰する）。 */
function shape(list: Site[]): Site[] {
  const now = Date.now();
  return list.map((s) => {
    const paused = typeof s.pauseUntil === 'number' && s.pauseUntil > now;
    const out: Site = { ...s, auto: paused ? false : s.auto };
    if (!paused) delete out.pauseUntil;
    return out;
  });
}

export async function GET() {
  return NextResponse.json(shape(await getSites()));
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

  /* ローカルbotからの一時停止／再開（secret必須）。
     ★「今すぐエステラブに登録」のように、bot自身が常駐を退かせてから
       作業したい場面がある。ダッシュボードのCookieは店のPCに無いので、
       reportRun と同じ IMPORT_SECRET で認証する。
     ★止めるだけ・戻すだけで、中村さんのON/OFF設定(auto)には触らない。 */
  if ((b?.action === 'pause' || b?.action === 'resume') && b?.secret) {
    if (!IMPORT_SECRET || b.secret !== IMPORT_SECRET) {
      return NextResponse.json({ ok: false, error: '認証エラー' }, { status: 401 });
    }
    const id = String(b?.id ?? '');
    const s = list.find((x) => x.id === id);
    if (!s) return NextResponse.json({ ok: false, error: '対象が見つかりません' }, { status: 400 });
    if (b.action === 'pause') {
      const min = Math.min(Math.max(Number(b?.minutes) || 10, 1), 60);
      s.pauseUntil = Date.now() + min * 60 * 1000;
    } else {
      delete s.pauseUntil;
    }
    try { await redis.set(KEY, JSON.stringify(list)); }
    catch { return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 }); }
    return NextResponse.json({ ok: true, site: shape([s])[0] });
  }

  // ダッシュボードからのON/OFF切替（管理者Cookie必須）
  if (!isAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const id = String(b?.id ?? '');
  const s = list.find((x) => x.id === id);
  if (!s) return NextResponse.json({ ok: false, error: '対象が見つかりません' }, { status: 400 });
  if (!s.ready) return NextResponse.json({ ok: false, error: 'このサイトは準備中です' }, { status: 400 });

  /* 「自分で触るあいだ止める」／「もう終わったので再開」。
     ★auto（中村さんの設定）は触らない。停止が明けたら元の状態に戻る。 */
  if (b?.action === 'pause') {
    const min = Math.min(Math.max(Number(b?.minutes) || 30, 5), 180); // 5〜180分
    s.pauseUntil = Date.now() + min * 60 * 1000;
  } else if (b?.action === 'resume') {
    delete s.pauseUntil;
  } else if (typeof b.auto === 'boolean') {
    s.auto = b.auto;
    delete s.pauseUntil; // 手でON/OFFしたら一時停止は解除する（設定がねじれないように）
  }

  try { await redis.set(KEY, JSON.stringify(list)); }
  catch { return NextResponse.json({ ok: false, error: 'DBに接続できません' }, { status: 500 }); }
  return NextResponse.json({ ok: true, site: shape([s])[0] });
}
