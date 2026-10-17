import exercises from "@/data/free-exercise-db.json";
// Public-domain reference data only; personal catalog continues to use /api/catalog.
export function GET() {
  return Response.json(exercises, {
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
