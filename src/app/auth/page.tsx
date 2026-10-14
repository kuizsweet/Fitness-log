import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { configured } from "@/lib/supabase/config";
export default function AuthPage() {
  return (
    <main className="narrow">
      <h1>Fitness Journal</h1>
      <Suspense fallback={<p>加载账号表单…</p>}>
        <AuthForm configured={configured()} />
      </Suspense>
    </main>
  );
}
