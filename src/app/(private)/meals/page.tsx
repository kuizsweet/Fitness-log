import { MealsPage } from "@/components/MealsPage";
import { dateSchema } from "@/lib/domain";
export const metadata = { title: "kuizFit · 三餐" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const date = dateSchema.safeParse((await searchParams).date);
  return <MealsPage initialDate={date.success ? date.data : undefined} />;
}
