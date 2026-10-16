import { redirect } from "next/navigation";
import Link from "next/link";
import { configured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { verifiedClaims } from "@/lib/supabase/claims";
import {
  AppNavigation,
  AccountMenu,
  AppMain,
  AppBrand,
} from "@/components/AppNavigation";
import styles from "@/components/AppShell.module.css";
import { DevPerformance } from "@/components/DevPerformance";
import { ResourceProvider } from "@/components/ResourceProvider";
import { Suspense } from "react";
import Loading from "./loading";
export const dynamic = "force-dynamic";
export default function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <DevPerformance />
      <header className="app-header">
        <AppBrand />
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
      <AppMain>
        <Suspense fallback={<Loading />}>
          <AuthorizedContent>{children}</AuthorizedContent>
        </Suspense>
      </AppMain>
    </div>
  );
}
async function AuthorizedContent({ children }: { children: React.ReactNode }) {
  if (!configured()) redirect("/");
  const db = await serverClient();
  const { data, error } = await verifiedClaims(db);
  if (error || !data?.claims.sub) redirect("/auth");
  return (
    <ResourceProvider user={data.claims.sub} key={data.claims.sub}>
      {children}
    </ResourceProvider>
  );
}
