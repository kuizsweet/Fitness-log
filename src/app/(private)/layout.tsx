import { redirect } from "next/navigation";
import Link from "next/link";
import { configured } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";
import { SignOut } from "@/components/SignOut";
export const dynamic = "force-dynamic";
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configured()) redirect("/");
  const db = await serverClient();
  const { data } = await db.auth.getUser();
  if (!data.user) redirect("/auth");
  return (
    <>
      <header>
        <Link className="brand" href="/journal">
          Fitness Journal
        </Link>
        <nav aria-label="主要导航">
          <Link href="/journal">日志</Link>
          <Link href="/train">训练</Link>
          <Link href="/history">历史查询</Link>
          <Link href="/catalog">动作与器材</Link>
          <Link href="/import">Excel 导入</Link>
          <Link href="/settings">设置与导出</Link>
          <SignOut />
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
