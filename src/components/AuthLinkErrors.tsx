"use client";
import { useEffect } from "react";
import { emailLinkError } from "@/lib/auth-links";

/** Supabase returns failed email confirmations in the fragment, invisible to server routes. */
export function AuthLinkErrors() {
  useEffect(() => {
    const check = () => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      if (!params.has("error")) return;
      const message =
        params.get("error_code") === "otp_expired"
          ? emailLinkError
          : "邮件认证失败，请重新发送邮件后重试。";
      window.location.replace(`/auth?error=${encodeURIComponent(message)}`);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);
  return null;
}
