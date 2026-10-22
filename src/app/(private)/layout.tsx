import { redirect } from "next/navigation";
import { configured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { verifiedClaims } from "@/lib/supabase/claims";
import {
  AppNavigation,
  HeaderActions,
  AppMain,
  AppBrand,
} from "@/components/AppNavigation";
import styles from "@/components/AppShell.module.css";
import { DevPerformance } from "@/components/DevPerformance";
import { ResourceProvider } from "@/components/ResourceProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MobileDock } from "@/components/MobileDock";

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
    <LanguageProvider>
      <ThemeProvider>
        <ResourceProvider user={data.claims.sub} key={data.claims.sub}>
          <div className={styles.shell}>
            <DevPerformance />
            <header className="app-header">
              <AppBrand />
              <AppNavigation />
              <HeaderActions />
            </header>
            <MobileDock />
            <AppMain>{children}</AppMain>
          </div>
        </ResourceProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
