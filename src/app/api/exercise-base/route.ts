import exercises from "@/data/hevy-exercises.json";
import videoExercises from "@/data/hevy-video-exercises.json";
import videoLinks from "@/data/hevy-video-links.json";
// Snapshot of the public Hevy website directory, not the private app catalog.
export function GET() {
  const aliases = new Map<string, string[]>();
  for (const link of videoLinks) {
    aliases.set(link.sourceId, [
      ...(aliases.get(link.sourceId) ?? []),
      link.alias,
      link.displayAlias,
    ]);
  }
  return Response.json(
    [
      ...exercises.map((item) => ({
        ...item,
        aliases: aliases.get(item.id) ?? [],
      })),
      ...videoExercises,
    ],
    {
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
