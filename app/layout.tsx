import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FPL Mini-League Awards',
  description: 'Let the awards ceremony commence for your FPL mini-league',
  openGraph: {
    title: 'FPL Mini-League Awards',
    description: 'Let the awards ceremony commence for your FPL mini-league',
    url: 'https://fpl-mini-league-awards.vercel.app',
    images: [{ url: 'https://fpl-mini-league-awards.vercel.app/gameweek-logo.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary',
    title: 'FPL Mini-League Awards',
    description: 'Let the awards ceremony commence for your FPL mini-league',
    images: ['https://fpl-mini-league-awards.vercel.app/gameweek-logo.png'],
  },
  icons: {
    icon: '/gameweek-logo.png',
    apple: '/gameweek-logo.png',
  },
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
