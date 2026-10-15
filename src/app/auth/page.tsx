import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { configured } from "@/lib/supabase/config";
import styles from "@/components/auth/AuthForm.module.css";
export const metadata = { title: "kuizfit · 账号" };
export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.page}>
          <p role="status">加载账号表单…</p>
        </main>
      }
    >
      <AuthForm configured={configured()} />
    </Suspense>
  );
}
