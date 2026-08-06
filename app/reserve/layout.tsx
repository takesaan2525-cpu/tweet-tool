import type { Metadata } from 'next';
import { SHOP } from '../shop.config';

// 予約ページはお客様が見る面なので、制作会社(GrowUP)ではなく店名で表示する。
// LINE等にリンクを貼ったときのプレビュー(タイトル/OGP)も店名義になる。
const TITLE = `${SHOP.name}｜ネット予約`;
export const metadata: Metadata = {
  title: TITLE,
  description: `${SHOP.name}のネット予約ページ。空いているお時間を選んでかんたんにご予約いただけます。`,
  openGraph: {
    title: TITLE,
    description: '空いているお時間を選んで、かんたんにご予約いただけます。',
    siteName: SHOP.name,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: '空いているお時間を選んで、かんたんにご予約いただけます。',
  },
};

export default function ReserveLayout({ children }: { children: React.ReactNode }) {
  return children;
}
