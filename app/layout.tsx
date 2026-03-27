import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Atom Editor',
  description: 'A fast, lightweight text editor in the browser',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
