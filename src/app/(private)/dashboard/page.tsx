import { Dashboard } from "@/components/Dashboard";
import { dateSchema } from "@/lib/domain";
import { BRAND_NAME } from "@/lib/brand";
export const metadata = { title: `${BRAND_NAME} · 控制台` };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const date = dateSchema.safeParse((await searchParams).date);
  return <Dashboard initialDate={date.success ? date.data : undefined} />;
}
