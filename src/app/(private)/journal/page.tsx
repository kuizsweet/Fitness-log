import { redirect } from "next/navigation";
import { dateSchema } from "@/lib/domain";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const date = dateSchema.safeParse((await searchParams).date);
  redirect(`/dashboard${date.success ? `?date=${date.data}` : ""}`);
}
