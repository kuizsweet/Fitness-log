import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthLinkErrors } from "@/components/AuthLinkErrors";
export const metadata: Metadata = {
  title: "kuizfit · 控制台",
  description: "个人训练与三餐记录",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "kuizfit" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthLinkErrors />
        {children}
      </body>
    </html>
  );
}
