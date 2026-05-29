import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'X投稿ツール | GrowUP サポート',
  description: 'ホームページ制作サービスの営業・集客用Xワンクリック投稿ツール',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full bg-zinc-950 text-white">{children}</body>
    </html>
  );
}
