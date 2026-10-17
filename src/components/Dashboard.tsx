"use client";
import { useDashboardData } from "./dashboard/useDashboardData";
import { DashboardWorkspace } from "./dashboard/DashboardWorkspace";
import { useSearchParams } from "next/navigation";
import { dateSchema } from "@/lib/domain";

export function Dashboard({ initialDate }: { initialDate?: string }) {
  const params = useSearchParams();
  const parsed = dateSchema.safeParse(params.get("date"));
  const data = useDashboardData(
    initialDate ?? (parsed.success ? parsed.data : undefined),
  );
  return <DashboardWorkspace data={data} />;
}
