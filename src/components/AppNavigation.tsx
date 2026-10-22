"use client";

import Image from "next/image";
import { BRAND_ASSET } from "@/lib/brand-assets";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type CSSProperties } from "react";
import appStyles from "./AppShell.module.css";
import { useThemePreference } from "./ThemeProvider";
import { BRAND_NAME } from "@/lib/brand";
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
      onClick={(event) => {
        setPreference(dark ? "light" : "dark");
        if (event.detail > 0) event.currentTarget.blur();
      }}
    >
      <SunMoonIcon state={dark} size={20} />
    </button>
  );
}

export function AppMain({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const area = links.find(([href]) => href === path)?.[2] ?? "neutral";
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (area !== "dashboard") return;
    const main = mainRef.current;
    const shell = main?.parentElement;
    const header = shell?.querySelector<HTMLElement>(":scope > .app-header");
    if (!main || !shell || !header) return;
    const compact = window.matchMedia("(max-width: 1023px)");
    const update = () => {
      const height = header.getBoundingClientRect().height;
      const offset = compact.matches
        ? Math.min(height, Math.max(0, main.scrollTop))
        : 0;
      shell.style.setProperty("--dashboard-header-height", `${height}px`);
      shell.style.setProperty("--dashboard-header-offset", `${offset}px`);
      header.style.opacity = `${1 - offset / Math.max(height, 1)}`;
      header.inert = compact.matches && offset >= height;
    };
    const observer = new ResizeObserver(update);
    observer.observe(header);
    main.addEventListener("scroll", update, { passive: true });
    compact.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      main.removeEventListener("scroll", update);
      compact.removeEventListener("change", update);
      header.inert = false;
      header.style.removeProperty("opacity");
      shell.style.removeProperty("--dashboard-header-height");
      shell.style.removeProperty("--dashboard-header-offset");
    };
  }, [area]);
  return (
    <main
      ref={mainRef}
      className={appStyles.main}
      data-area={area}
      aria-label={area === "dashboard" ? "控制台" : undefined}
    >
      {children}
    </main>
  );
}
