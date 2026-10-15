import { redirect } from "next/navigation";
import Link from "next/link";
import { configured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { verifiedClaims } from "@/lib/supabase/claims";
import {
  AppNavigation,
  AccountMenu,
  AppMain,
  DashboardBrand,
} from "@/components/AppNavigation";
export const dynamic = "force-dynamic";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configured()) redirect("/");
  const db = await serverClient();
  const { data, error } = await verifiedClaims(db);
  if (error || !data?.claims.sub) redirect("/auth");
  return (
    <>
      <header className="app-header">
        <DashboardBrand />
        <AppNavigation />
        <div className="header-actions">
          <AccountMenu />
          <Link
            className="system-settings"
            href="/settings"
            aria-label="系统设置"
            title="系统设置"
          >
            <svg
              viewBox="0 0 24 24"
              width="21"
              height="21"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="m9.5 3-.6 2.2-2 .9-2-.6-2.4 4 1.6 1.6v2l-1.6 1.6 2.4 4 2-.6 2 .9.6 2.2h5l.6-2.2 2-.9 2 .6 2.4-4-1.6-1.6v-2l1.6-1.6-2.4-4-2 .6-2-.9-.6-2.2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
        </div>
      </header>
      <AppMain>{children}</AppMain>
    </>
  );
}
