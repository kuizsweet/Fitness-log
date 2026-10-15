"use client";
import { useDashboardData } from "./dashboard/useDashboardData";
import { DashboardWorkspace } from "./dashboard/DashboardWorkspace";

export function Dashboard({ initialDate }: { initialDate?: string }) {
  const data = useDashboardData(initialDate);
  return <DashboardWorkspace data={data} />;
}
