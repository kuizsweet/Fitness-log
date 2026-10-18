import { z } from "zod";
import { context, check, failure, json, ApiError } from "@/lib/api";
import { preparePhoto, MAX_PHOTO_BYTES } from "@/lib/photos";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    if (
      Number(request.headers.get("content-length")) >
      MAX_PHOTO_BYTES + 200_000
    )
      throw new ApiError("照片需小于 3 MB", 413);
    const form = await request.formData();
    const mealId = z.uuid().parse(form.get("meal_id"));
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError("请选择照片");
    const meal = await db
      .from("meal_entries")
      .select("id")
      .eq("id", mealId)
      .single();
    check(meal.error);
    const bytes = await preparePhoto(
      Buffer.from(await file.arrayBuffer()),
      file.name,
    );
    const id = crypto.randomUUID();
    const path = `${user.id}/${mealId}/${id}.jpg`;
    const upload = await db.storage
      .from("meal-photos")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    check(upload.error);
    const result = await db
      .from("meal_photos")
      .insert({
        id,
        user_id: user.id,
        meal_id: mealId,
        storage_path: path,
        original_name: file.name,
        byte_size: bytes.length,
      })
      .select()
      .single();
    if (result.error) {
      const cleanup = await db.storage.from("meal-photos").remove([path]);
      if (cleanup.error)
        throw new ApiError(
          "数据库记录失败，图片清理也失败；请按 README 的孤立图片检查步骤处理。",
        );
      check(result.error);
    }
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { db } = await context(request);
    const input = z
      .object({
        id: z.uuid(),
        restore: z.boolean().optional(),
        notes: z.string().max(4000).optional(),
      })
      .refine(
        (value) => value.restore !== undefined || value.notes !== undefined,
        "请选择要修改的照片信息",
      )
      .parse(await request.json());
    const result = await db
      .from("meal_photos")
      .update({
        ...(input.restore !== undefined
          ? { deleted_at: input.restore ? null : new Date().toISOString() }
          : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      })
      .eq("id", input.id)
      .select()
      .single();
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
