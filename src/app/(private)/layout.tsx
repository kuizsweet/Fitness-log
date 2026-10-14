import { redirect } from "next/navigation";
import { configured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { verifiedClaims } from "@/lib/supabase/claims";
import {
  AppNavigation,
  AccountMenu,
  AppMain,
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
        <AppNavigation />
        <AccountMenu />
      </header>
      <AppMain>{children}</AppMain>
    </>
  );
}
