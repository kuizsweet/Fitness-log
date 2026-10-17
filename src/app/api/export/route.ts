import { context, check, failure, ApiError } from "@/lib/api";
import { exportCsv } from "@/lib/export";
import { hydrateSessions } from "@/lib/session-hydration";
import { BRAND_NAME } from "@/lib/brand";
export async function GET(request: Request) {
  try {
    const { db } = await context();
    const format = new URL(request.url).searchParams.get("format");
    // Range-paginate roots rather than silently exporting only PostgREST's default first 1000.
    const tables = [
      "profiles",
      "exercises",
      "equipment",
      "workout_sessions",
      "workout_exercises",
      "workout_sets",
      "meal_entries",
      "meal_photos",
      "import_batches",
      "daily_checkins",
      "checkin_preferences",
    ] as const;
    const result: Record<string, unknown[]> = {};
    for (const table of tables) {
      const rows: unknown[] = [];
      for (let start = 0; ; start += 500) {
        const page = await db
          .from(table)
          .select("*")
          .order(
            table === "daily_checkins"
              ? "checkin_date"
              : ["profiles", "checkin_preferences"].includes(table)
                ? "user_id"
                : "id",
          )
          .range(start, start + 499);
        check(page.error);
        rows.push(...page.data!);
        if (page.data!.length < 500) break;
      }
      result[table] = rows;
    }
    if (format === "csv") {
      // Hydrate from the complete exported rows; no default query limit.
      const sessions = result.workout_sessions as Parameters<
        typeof hydrateSessions
      >[0];
      const hydrated = hydrateSessions(
        sessions.filter((s) => !s.deleted_at),
        result.workout_exercises as Parameters<typeof hydrateSessions>[1],
        result.workout_sets as Parameters<typeof hydrateSessions>[2],
      );
      return new Response(exportCsv(hydrated), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${BRAND_NAME}.csv"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (format !== "json") throw new ApiError("导出格式无效");
    const photos = result.meal_photos as { storage_path: string }[];
    const links = [];
    for (const p of photos) {
      const signed = await db.storage
        .from("meal-photos")
        .createSignedUrl(p.storage_path, 3600, { download: true });
      check(signed.error);
      links.push({
        storage_path: p.storage_path,
        download_url: signed.data?.signedUrl,
        expires_in_seconds: 3600,
      });
    }
    return new Response(
      JSON.stringify(
        {
          version: 1,
          exported_at: new Date().toISOString(),
          data: result,
          photo_backup: links,
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${BRAND_NAME}.json"`,
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
