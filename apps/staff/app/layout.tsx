import '@apex/ui/styles/globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '직원 앱',
  description: 'APLAN 직원용 앱',
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
