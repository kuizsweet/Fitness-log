"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
export function SignOut() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const result = await browserClient().auth.signOut();
          if (result.error) {
            setError(result.error.message);
            setBusy(false);
          } else window.location.assign("/auth");
        }}
      >
        退出
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
