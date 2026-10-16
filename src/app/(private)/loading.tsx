"use client";
import { usePathname } from "next/navigation";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
export default function Loading() {
  const path = usePathname();
  return path === "/dashboard" ? (
    <DashboardSkeleton />
  ) : (
    <div className="page-loading-skeleton" aria-busy="true" />
  );
}
