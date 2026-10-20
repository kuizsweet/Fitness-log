"use client";

import Image from "next/image";
import { BRAND_ASSET } from "@/lib/brand-assets";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type CSSProperties } from "react";
import appStyles from "./AppShell.module.css";
import { useThemePreference } from "./ThemeProvider";
import { BRAND_NAME } from "@/lib/brand";
import { MobileDock } from "./MobileDock";
import { LanguageMorphButton } from "./LanguageMorphButton";
import { AccountMenu } from "./MyMenu";
import { SunMoonIcon } from "./ui/SunMoonIcon";

export function AppBrand() {
  return (
    <Link
      href="/dashboard"
      className={appStyles.brand}
      aria-label={`${BRAND_NAME} 控制台`}
    >
      <Image
        src={`${BRAND_ASSET}-logo.webp`}
        width={40}
        height={40}
        alt=""
        unoptimized
        priority
        className={appStyles.brandLogo}
      />
      {BRAND_NAME}
    </Link>
  );
}

const links = [
  ["/dashboard", "控制台", "dashboard"],
  ["/config", "配置", "configuration"],
  ["/meals", "三餐", "meals"],
  ["/leaderboard", "排行榜", "checkin"],
];

export function AppNavigation() {
  const path = usePathname();
  const selected = Math.max(
    0,
    links.findIndex(([href]) => path === href),
  );
  return (
    <>
      <nav
        className="app-nav"
        aria-label="主要导航"
        style={{ "--nav-index": selected } as CSSProperties}
      >
        <span className="navigation-thumb" aria-hidden="true" />
        {links.map(([href, label, area]) => (
          <Link
            key={href}
            href={href}
            data-area={area}
            aria-current={path === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <MobileDock />
    </>
  );
}

export function HeaderActions() {
  return (
    <div className="header-actions">
      <ThemeMenu />
      <LanguageMorphButton />
      <AccountMenu />
    </div>
  );
}

function ThemeMenu() {
  const { preference, setPreference } = useThemePreference();
  const dark = preference === "dark";
  return (
    <button
      type="button"
      className="header-icon-button theme-morph-button"
      aria-label={dark ? "切换为浅色主题" : "切换为深色主题"}
      title={dark ? "切换为浅色主题" : "切换为深色主题"}
      aria-pressed={dark}
      onClick={() => setPreference(dark ? "light" : "dark")}
    >
      <SunMoonIcon state={dark} size={20} />
    </button>
  );
}

export function AppMain({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const area = links.find(([href]) => href === path)?.[2] ?? "neutral";
  return (
    <main
      className={appStyles.main}
      data-area={area}
      aria-label={area === "dashboard" ? "控制台" : undefined}
    >
      {children}
    </main>
  );
}
