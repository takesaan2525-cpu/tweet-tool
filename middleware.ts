import { NextResponse, type NextRequest } from 'next/server';

/* 秘密キー付きURL方式のゲート。
   /gate?key=<ADMIN_KEY> を一度開くとCookieがセットされ、以後は管理APIの書き込み系に入れる。
   ADMIN_KEY はVercelの環境変数に長いランダム文字列で設定する（未設定なら書き込み系は全部閉じる）。

   ★2026-08-10 の整理（2つのことをやった）
     ①店の人が使うページ（/ /dashboard /staff /status /times /photos /reserve）は
       ゲート撤廃＝パスワード画面なしで開ける。毎日使う道具なので入口で詰まらせない。
     ②代わりに「データを動かす側」だけを守る。
       ・予約データの閲覧/削除 … ここ（/api/reservations の GET/DELETE）
       ・キャスト追加削除・媒体ON/OFF … 各APIルート内の isAdmin() チェック
     ③このプロジェクトにあった営業ツール（DMテンプレ・営業リスト）は
       別プロジェクト growup-sales へ移設し、ここからは完全に削除した。
       ＝店に渡すURLから /dashboard を消しても、営業リストには一切到達できない。 */
const ADMIN_KEY = process.env.ADMIN_KEY ?? '';
const COOKIE = 'gk';

const isAuthed = (req: NextRequest) =>
  !!ADMIN_KEY && req.cookies.get(COOKIE)?.value === ADMIN_KEY;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ゲート：キーが合えばCookieを1年セットしてダッシュボードへ（店側）
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

  /* 公開のまま残すもの＝外から叩かれる必要があるものだけ。
     ・予約の送信（お客様の予約フォーム）
     ・LINEサーバーからのwebhook受信
     ★どちらも POST だけ。GET は下の鍵チェックに落とす。 */
  if (pathname === '/api/reservations' && req.method === 'POST') return NextResponse.next();
  if (pathname === '/api/line-webhook' && req.method === 'POST') return NextResponse.next();

  /* ★ここから先はCookie必須。中身が個人情報だから。
       ・/api/reservations の GET/DELETE … お客様の予約（名前・電話）
       ・/api/line-webhook の GET      … 友だち追加した人のLINE userId と名前
     ★2026-08-10：line-webhook を matcher から外してしまい、GETで
       LINE userId 一覧が誰でも読める状態を一時的に作ってしまった。
       「POSTさえ通ればいい」と考えて matcher ごと外したのが原因。
       ＝公開したいのは"メソッド"であって"パス"ではない。必ず matcher には残し、
         中で method を見て通すこと。 */
  if (isAuthed(req)) return NextResponse.next();
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

export const config = {
  matcher: ['/gate', '/api/reservations', '/api/line-webhook'],
};
