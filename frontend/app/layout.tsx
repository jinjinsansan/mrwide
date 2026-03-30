import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mr.Wide | 地方競馬AI指数",
  description: "地方競馬専門 AI Wide指数。毎日全レースの3着以内確率を数値化。TornadoAIシリーズ。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen overflow-x-hidden">{children}</body>
    </html>
  );
}
