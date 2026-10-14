import { Journal } from "@/components/Journal";
import { dateSchema } from "@/lib/domain";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const date = dateSchema.safeParse((await searchParams).date);
  return <Journal initialDate={date.success ? date.data : undefined} />;
}
