import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthLinkErrors } from "@/components/AuthLinkErrors";
import Script from "next/script";
import { BRAND_NAME } from "@/lib/brand";
import { BRAND_ASSET } from "@/lib/brand-assets";
const themeBootstrap = `(()=>{try{const k="kuizfit-theme";const v=localStorage.getItem(k);const p=v==="light"?"light":"dark";const e=document.documentElement;e.dataset.themePreference=p;e.dataset.theme=p;e.style.colorScheme=p}catch{document.documentElement.dataset.theme="dark";document.documentElement.dataset.themePreference="dark"}})()`;
export const metadata: Metadata = {
  title: `${BRAND_NAME} · 控制台`,
  description: "个人训练与三餐记录",
  manifest: `${BRAND_ASSET}.webmanifest`,
  icons: {
    icon: [
      { url: `${BRAND_ASSET}-16.png`, sizes: "16x16", type: "image/png" },
      { url: `${BRAND_ASSET}-32.png`, sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: `${BRAND_ASSET}-180.png`, sizes: "180x180", type: "image/png" },
    ],
  },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: BRAND_NAME },
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
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <AuthLinkErrors />
        {children}
        <Script id="kuizfit-theme-bootstrap" strategy="beforeInteractive">
          {themeBootstrap}
        </Script>
      </body>
    </html>
  );
}
