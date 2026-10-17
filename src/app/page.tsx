import { redirect } from "next/navigation";
import { configured } from "@/lib/supabase/config";
import { BRAND_NAME } from "@/lib/brand";
export default function Home() {
  if (configured()) redirect("/dashboard");
  return (
    <main className="narrow">
      <h1>{BRAND_NAME}</h1>
      <p>尚未连接 Supabase。</p>
      <p>
        请配置 .env.local 中的 Supabase URL、Publishable Key
        与网站地址，并运行数据库迁移。
      </p>
      <p>配置完成前不能注册、保存训练或上传照片。完整步骤见项目 README。</p>
      <a href="/auth">查看账号入口</a>
    </main>
  );
}
