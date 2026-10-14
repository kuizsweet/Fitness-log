import { createHash } from "node:crypto";
import { context, check, failure, json, ApiError } from "@/lib/api";
import { readWorkbook } from "@/lib/import/workbook";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    if (Number(request.headers.get("content-length")) > 3_300_000)
      throw new ApiError("Excel 需小于 3 MB", 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.xlsx$/i.test(file.name))
      throw new ApiError("请选择 .xlsx 文件");
    const bytes = Buffer.from(await file.arrayBuffer());
    const workbook = await readWorkbook(bytes);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const duplicate = await db
      .from("import_batches")
      .select("id,undone_at")
      .eq("file_hash", hash)
      .maybeSingle();
    check(duplicate.error);
    if (duplicate.data)
      throw new ApiError(
        "同一文件已经导入（含已撤销批次），不会再次创建。需要修正时请修改原工作簿另存。",
        409,
      );
    const preview = await db
      .from("import_previews")
      .insert({
        user_id: user.id,
        filename: file.name,
        file_hash: hash,
        source: workbook,
      })
      .select("id")
      .single();
    check(preview.error);
    if (!preview.data) throw new ApiError("预览保存失败");
    return json({ id: preview.data.id, filename: file.name, workbook });
  } catch (e) {
    return failure(e);
  }
}
