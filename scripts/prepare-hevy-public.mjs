import fs from "node:fs";
const files = [
  "test-results/hevy-public-directory.html",
  ...fs
    .readdirSync("test-results")
    .filter((f) => /^hevy-public-page-\d+\.html$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((f) => "test-results/" + f),
];
const rows = [];
const decode = (s) =>
  s
    .replace(/&#0?39;|&#8217;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&quot;/g, '"')
    .trim();
for (const [i, file] of files.entries()) {
  const html = fs.readFileSync(file, "utf8");
  for (const m of html.matchAll(
    /<article\b([^>]*class="[^"]*\btype-exercises\b[^"]*"[^>]*)>([\s\S]*?)<\/article>/g,
  )) {
    const title = m[2].match(/<h4[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)<\/a>/s);
    if (!title) throw Error("Missing title");
    const tags = (kind) =>
      [
        ...m[1].matchAll(new RegExp("(?:^|\\s)" + kind + "-([a-z0-9-]+)", "g")),
      ].map((x) => x[1]);
    rows.push({
      id: m[1].match(/id="post-(\d+)"/)[1],
      name: decode(title[2]),
      primaryMuscles: tags("muscle"),
      secondaryMuscles: [],
      equipment: tags("equipment")[0] ?? null,
      category: tags("exercise_type")[0] ?? "strength",
      url: title[1],
      sourcePage:
        i === 0
          ? "https://www.hevyapp.com/exercises/"
          : `https://www.hevyapp.com/exercises/page/${i + 1}/`,
    });
  }
}
const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
fs.writeFileSync(
  "src/data/hevy-exercises.json",
  JSON.stringify(unique, null, 2) + "\n",
);
console.log("Extracted", rows.length, "rows", files.length, "pages");
console.log("equipment", [...new Set(rows.map((r) => r.equipment))]);
console.log("muscles", [...new Set(rows.flatMap((r) => r.primaryMuscles))]);
