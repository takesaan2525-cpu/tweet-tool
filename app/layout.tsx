import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GrowUP 店舗DX',
  description: 'メンズエステ店舗向け業務自動化システム｜掲載更新・ネット予約・LINE通知・予約管理を1つの管理画面にまとめます。',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'GrowUP',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-zinc-950 text-white">{children}</body>
    </html>
  );
}
