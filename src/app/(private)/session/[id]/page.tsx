import { SessionLoader } from "@/components/SessionEditor";
import { dateSchema } from "@/lib/domain";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    date?: string;
    active?: string;
    planned?: string;
    template?: string;
  }>;
}) {
  const { id } = await params;
  const p = await searchParams;
  const date = dateSchema.safeParse(p.date);
  return (
    <SessionLoader
      id={id === "new" ? undefined : id}
      date={date.success ? date.data : undefined}
      active={p.active === "1"}
      planned={p.planned === "1"}
      template={id === "new" ? p.template : undefined}
    />
  );
}
