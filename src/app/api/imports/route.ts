import { z } from "zod";
import { context, check, failure, json, ApiError } from "@/lib/api";
import { importRowSchema, type Workbook } from "@/lib/import/parser";
import { importSessions } from "@/lib/import/convert";
import { sessionSchema } from "@/lib/domain";
export async function GET() {
  try {
    const { db } = await context();
    const result = await db
      .from("import_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db } = await context(request);
    const input = z
      .object({
        preview_id: z.uuid(),
        rows: z.array(importRowSchema).min(1).max(5000),
        acknowledged_images: z.boolean(),
        excluded: z.array(z.string()).max(5000),
      })
      .parse(await request.json());
    if (input.rows.some((r) => r.mode === "per_side"))
      throw new ApiError("Excel 单列重量不能作为左右装载重量导入");
    const p = await db
      .from("import_previews")
      .select("*")
      .eq("id", input.preview_id)
      .gt("expires_at", new Date().toISOString())
      .single();
    check(p.error);
    const workbook = p.data.source as Workbook;
    if (workbook.images.length && !input.acknowledged_images)
      throw new ApiError("请确认未导入图片列表");
    const sources = new Set(
      workbook.sheets.flatMap((s) => s.rows.map((r) => `${s.name}:${r.line}`)),
    );
    const unique = new Set(input.rows.map((r) => r.source));
    if (
      unique.size !== input.rows.length ||
      input.rows.some((r) => !sources.has(r.source))
    )
      throw new ApiError("来源行无效或重复");
    const sessions = importSessions(input.rows).map((s) =>
      sessionSchema.parse(s),
    );
    const result = await db.rpc("commit_import", {
      file_name: p.data.filename,
      file_hash: p.data.file_hash,
      row_count: input.rows.length,
      report: {
        confirmed_rows: input.rows,
        source_rows: workbook.sheets,
        excluded: input.excluded,
        unimported_images: workbook.images,
        warnings: workbook.warnings,
      },
      sessions,
    });
    check(result.error);
    return json({
      id: result.data,
      rows: input.rows.length,
      sessions: sessions.length,
      excluded: input.excluded.length,
      unimported_images: workbook.images.length,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { db } = await context(request);
    const { id } = z.object({ id: z.uuid() }).parse(await request.json());
    const result = await db.rpc("undo_import", { batch_id: id });
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
