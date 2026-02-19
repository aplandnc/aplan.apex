import "./globals.css";
import "@apex/ui/styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "APEX - INFO DESK",
  description: "APlan EXecutive System",
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
