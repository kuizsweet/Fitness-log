import { Training } from "@/components/Training";
import { dateSchema } from "@/lib/domain";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const date = dateSchema.safeParse((await searchParams).date);
  return <Training initialDate={date.success ? date.data : undefined} />;
}
