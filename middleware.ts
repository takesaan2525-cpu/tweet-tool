import { NextResponse, type NextRequest } from 'next/server';

// 秘密キー付きURL方式のゲート。
// /gate?key=<ADMIN_KEY> を一度開くとCookieがセットされ、以後は管理ページ・管理APIに入れる。
// ADMIN_KEY はVercelの環境変数に長いランダム文字列で設定する（未設定なら管理系は全部閉じる）。
const ADMIN_KEY = process.env.ADMIN_KEY ?? '';
const COOKIE = 'gk';

const isAuthed = (req: NextRequest) =>
  !!ADMIN_KEY && req.cookies.get(COOKIE)?.value === ADMIN_KEY;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ゲート：キーが合えばCookieを1年セットしてダッシュボードへ
  if (pathname === '/gate') {
    if (ADMIN_KEY && req.nextUrl.searchParams.get('key') === ADMIN_KEY) {
      const res = NextResponse.redirect(new URL('/dashboard', req.url));
      res.cookies.set(COOKIE, ADMIN_KEY, {
        httpOnly: true, secure: true, sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, path: '/',
      });
      return res;
    }
    return new NextResponse('Not Found', { status: 404 });
  }

  // 公開のまま残すもの：予約の送信、LINEサーバーからのwebhook受信
  if (pathname === '/api/reservations' && req.method === 'POST') return NextResponse.next();
  if (pathname === '/api/line-webhook' && req.method === 'POST') return NextResponse.next();

  // それ以外のマッチ対象（/staff /dashboard、予約一覧GET、LINE友だちGET、掲載サイト）はCookie必須
  if (isAuthed(req)) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  return new NextResponse('Not Found', { status: 404 });
}

export const config = {
  matcher: [
    '/gate',
    '/list',
    '/staff/:path*',
    '/dashboard/:path*',
    '/api/reservations',
    '/api/line-webhook',
  ],
};
