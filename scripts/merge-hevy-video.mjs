import fs from "node:fs";
import crypto from "node:crypto";
const base = JSON.parse(fs.readFileSync("src/data/hevy-exercises.json"));
const names = JSON.parse(fs.readFileSync("src/data/hevy-exercises-zh.json"));
const review = JSON.parse(fs.readFileSync("src/data/hevy-video-review.json"));
const synonyms = {
  肩推: "过顶推举",
  深蹲: "深蹲",
  二头弯举: "弯举",
  俯身划船: "俯身划船",
  颈前深蹲: "前蹲",
  哈克深蹲: "哈克深蹲",
  反向弯举: "反握弯举",
  臀部火腿抬高: "臀腿挺身",
  侧腿抬高: "侧卧抬腿",
  下斜卷腹: "斜板卷腹",
  早安运动: "早安式",
  胸部支撑上斜划船: "上斜凳胸托划船",
  胸推: "推胸",
  前杆升高: "前水平抬升",
  单臂颈后臂屈伸: "单臂过顶臂屈伸",
  直腿后摆: "跪姿后踢腿",
  跪姿后踢腿: "跪姿后踢腿",
  单臂臂屈伸: "单臂过顶臂屈伸",
  单臂哑铃弯举: "集中弯举（哑铃）",
  风轮弯举: "交叉锤式弯举",
  佐特曼弯举: "佐特曼弯举",
  泽奇深蹲: "泽奇深蹲",
  消防栓式抬腿: "消防栓式抬腿",
  双杠撑体: "双杠屈臂撑胸",
  三头肌撑体: "双杠臂屈伸",
  三头肌下压: "下压",
  三头下压训练: "下压",
  三头肌绳索下压: "三头肌下压（绳索）",
  阿诺肩推: "阿诺德推举",
  保加利亚分腿蹲: "保加利亚分腿蹲",
  早安式: "早安式",
};
function normal(name) {
  for (const [a, b] of Object.entries(synonyms)) name = name.replaceAll(a, b);
  return name
    .replace(/（自重）/g, "")
    .replace(/（负重）/g, "")
    .replaceAll("负重", "")
    .replaceAll("站立", "站姿")
    .replace(/土其/g, "土耳其")
    .toLowerCase();
}
// Weighted/assisted variants must not merge into their unweighted exercise.
function key(name) {
  return (
    normal(name) +
    (/负重|加重/.test(name) ? "|weighted" : "") +
    (/辅助/.test(name) ? "|assisted" : "")
  );
}
const indexed = new Map(base.map((r) => [key(names[r.id]), r]));
const additional = [];
const links = [];
const seen = new Set();
for (const r of review.entries) {
  let found = indexed.get(key(r.localizedName));
  if (!found && r.equipment === null) {
    const k = key(r.localizedName);
    const matches = base.filter(
      (b) => key(names[b.id]).replace(/（[^）]*）/g, "") === k,
    );
    if (matches.length === 1) found = matches[0];
  }
  if (found) {
    links.push({
      sourceId: found.id,
      alias: r.rawName,
      displayAlias: r.localizedName,
      seconds: r.seconds,
    });
    continue;
  }
  const k = key(r.localizedName);
  if (seen.has(k)) continue;
  seen.add(k);
  additional.push({
    id:
      "video-" +
      crypto.createHash("sha256").update(k).digest("hex").slice(0, 16),
    name: r.rawName,
    localizedName: r.localizedName,
    aliases: [r.rawName],
    primaryMuscles: r.primaryMuscles,
    secondaryMuscles: [],
    equipment: r.equipment,
    category: r.category,
    sourceVideo: review.sourceVideo,
    sourceSeconds: r.seconds,
    sourceFrame: r.frame,
  });
}
fs.writeFileSync(
  "src/data/hevy-video-exercises.json",
  JSON.stringify(additional, null, 2) + "\n",
);
fs.writeFileSync(
  "src/data/hevy-video-links.json",
  JSON.stringify(links, null, 2) + "\n",
);
console.log({
  reviewed: review.entries.length,
  added: additional.length,
  matched: links.length,
  total: base.length + additional.length,
  pending: review.pending.length,
});
