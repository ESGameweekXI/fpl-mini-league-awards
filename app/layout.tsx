import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FPL Mini-League Awards',
  description: 'Spotify Wrapped for your Fantasy Premier League mini-league',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className="min-h-full flex flex-col"
        style={{ background: '#021a16' }}
      >
        {children}
      </body>
    </html>
  );
}
