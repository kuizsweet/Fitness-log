"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { SignOut } from "./SignOut";
import dashboardStyles from "./dashboard/Dashboard.module.css";

export function DashboardBrand() {
  return usePathname() === "/dashboard" ? (
    <Link
      href="/dashboard"
      className={dashboardStyles.brand}
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
  ) : null;
}

const links = [
  ["/dashboard", "控制台", "dashboard"],
  ["/train", "训练", "training"],
  ["/catalog", "动作与器材", "catalog"],
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
          aria-current={path === href ? "page" : undefined}
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

export function AccountMenu() {
  const path = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && menu.current)
        menu.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <details className="account-menu" key={path} ref={menu}>
      <summary aria-label="个人账号" title="个人账号">
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
      </summary>
      <div className="account-panel">
        <p>个人账号</p>
        <Link href="/settings">账号设置与导出</Link>
        <Link href="/import">Excel 导入</Link>
        <SignOut />
      </div>
    </details>
  );
}

export function AppMain({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const area =
    links.find(([href]) => href === path)?.[2] ??
    (path.startsWith("/session") ? "training" : "neutral");
  return (
    <main
      data-area={area}
      aria-label={area === "dashboard" ? "控制台" : undefined}
    >
      {children}
    </main>
  );
}
