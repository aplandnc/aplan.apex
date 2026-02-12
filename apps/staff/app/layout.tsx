import '@apex/ui/styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '에이플랜 업무',
  description: 'APLAN 업무시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
