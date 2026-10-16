"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Languages, Moon, Settings2, Sun, UserRound } from "lucide-react";
import { SignOut, useSignOut } from "./SignOut";
import appStyles from "./AppShell.module.css";
import { useThemePreference } from "./ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Settings } from "./Settings";

export function AppBrand() {
  return (
    <Link
      href="/dashboard"
      className={appStyles.brand}
      aria-label="kuizFit 控制台"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <path d="m5 13 4-4 4 6 3-5h3" />
      </svg>
      kuizFit
    </Link>
  );
}

const links = [
  ["/dashboard", "控制台", "dashboard"],
  ["/train", "配置", "configuration"],
  ["/dashboard?openMeals=1", "三餐", "meals"],
  ["/leaderboard", "排行榜", "checkin"],
];

export function AppNavigation() {
  const path = usePathname();
  return (
    <nav className="app-nav" aria-label="主要导航">
      {links.map(([href, label, area]) => (
        <Link
          key={href}
          href={href}
          data-area={area}
          aria-current={
            path === href || (href === "/train" && path.startsWith("/session/"))
              ? "page"
              : undefined
          }
        >
          {label}
          <NavigationPending />
        </Link>
      ))}
    </nav>
  );
}

function NavigationPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`navigation-pending${pending ? " is-pending" : ""}`}
      aria-hidden="true"
    />
  );
}

export function HeaderActions() {
  return (
    <div className="header-actions">
      <ThemeMenu />
      <LanguageMenu />
      <AccountMenu />
    </div>
  );
}

function ThemeMenu() {
  const { preference, setPreference } = useThemePreference();
  const nextTheme = preference === "dark" ? "light" : "dark";
  return (
    <button
      className="header-icon-button"
      type="button"
      aria-label={`切换为${nextTheme === "light" ? "浅色" : "深色"}主题`}
      title={`切换为${nextTheme === "light" ? "浅色" : "深色"}主题`}
      onClick={() => setPreference(nextTheme)}
    >
      <span className="header-theme-icons" aria-hidden="true">
        <Sun className="theme-icon-sun" size={18} strokeWidth={1.8} />
        <Moon className="theme-icon-moon" size={18} strokeWidth={1.8} />
      </span>
    </button>
  );
}

type Language = "zh-CN" | "en";
function LanguageMenu() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "zh-CN";
    try {
      return localStorage.getItem("kuizfit-language") === "en" ? "en" : "zh-CN";
    } catch {
      return "zh-CN";
    }
  });
  function toggleLanguage() {
    const next = language === "zh-CN" ? "en" : "zh-CN";
    setLanguage(next);
    try {
      localStorage.setItem("kuizfit-language", next);
    } catch {
      // The selected state remains available until this page is closed.
    }
  }
  const nextLabel = language === "zh-CN" ? "English" : "简体中文";
  return (
    <button
      className="header-icon-button"
      type="button"
      aria-label={`切换语言为${nextLabel}`}
      title={`切换语言为${nextLabel}`}
      onClick={toggleLanguage}
    >
      <Languages size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}

export function AccountMenu() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const accountTrigger = useRef<HTMLButtonElement>(null);
  const { signOut, error, busy } = useSignOut();
  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            ref={accountTrigger}
            className="header-icon-button account-trigger"
            type="button"
            aria-label="个人账号"
            title="个人账号"
          >
            <UserRound size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent key={path} aria-label="个人账号菜单" align="end">
          <DropdownMenuLabel>个人账号</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href="/import">Excel 导入</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setOpen(false);
              setSettingsOpen(true);
            }}
          >
            <Settings2 size={16} aria-hidden="true" />
            设置与导出
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={busy}
            onSelect={(event) => {
              event.preventDefault();
              void signOut();
            }}
          >
            <SignOut />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <span className="sr-only" role="alert">
          {error}
        </span>
      )}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            accountTrigger.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>设置与导出</DialogTitle>
          </DialogHeader>
          <Settings embedded />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AppMain({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const area =
    links.find(([href]) => href === path)?.[2] ??
    (path.startsWith("/session") ? "configuration" : "neutral");
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
