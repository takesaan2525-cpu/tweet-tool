import type { Metadata } from 'next';

const title = 'GrowUP 店舗DX｜操作デモ';
const description =
  'メンエス店舗向け。掲載情報の定期更新・ネット予約・LINE通知・予約管理を1つの管理画面に。先行導入：初期設定費55,000円・月額9,800円。登録不要の操作デモはこちら。';
const url = 'https://tweet-tool-six.vercel.app/demo';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url,
    siteName: 'GrowUP 店舗DX',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: '/og-demo.png', width: 1800, height: 945, alt: title }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og-demo.png'],
  },
  metadataBase: new URL('https://tweet-tool-six.vercel.app'),
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
