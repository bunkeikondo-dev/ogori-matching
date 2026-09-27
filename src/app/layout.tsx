import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'おごり自販機マッチング',
  description: '部署を越えたコミュニケーションを楽しむ、社内リアルタイムマッチングシステム',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0058a8',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="bg-gradient-to-r from-brand-900 via-brand-700 to-brand-500 text-white shadow-md">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xl"
            >
              🥤
            </span>
            <span className="text-lg font-bold tracking-wide">おごり自販機マッチング</span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
