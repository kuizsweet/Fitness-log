"use client";
import { usePathname } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
export default function Loading() {
  const path = usePathname();
  return path === "/dashboard" ? (
    <Dashboard />
  ) : (
    <div className="page-loading-skeleton" aria-busy="true" />
  );
}
