"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { clearUserCache } from "@/lib/query-cache";
export function useSignOut() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    setError("");
    const result = await browserClient().auth.signOut();
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
    } else {
      clearUserCache();
      window.location.assign("/auth");
    }
  }
  return { signOut, error, busy };
}

export function SignOut() {
  return <span>退出</span>;
}
