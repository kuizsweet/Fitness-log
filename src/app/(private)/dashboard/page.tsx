import { Dashboard } from "@/components/Dashboard";
import { dateSchema } from "@/lib/domain";
export const metadata = { title: "kuizfit · 控制台" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const date = dateSchema.safeParse((await searchParams).date);
  return <Dashboard initialDate={date.success ? date.data : undefined} />;
}
