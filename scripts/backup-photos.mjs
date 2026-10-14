import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
// User-invoked tool, never accepts paths from JSON without containment validation.
const [input, output = "photo-backup"] = process.argv.slice(2);
if (!input)
  throw new Error(
    "用法：node scripts/backup-photos.mjs fitness-journal.json photo-backup",
  );
const data = JSON.parse(await readFile(input, "utf8"));
const root = path.resolve(output);
await mkdir(root, { recursive: true });
let failed = 0;
for (const p of data.photo_backup ?? []) {
  try {
    if (
      typeof p.storage_path !== "string" ||
      !/^[-\w]+\/[-\w]+\/[-\w]+\.jpg$/.test(p.storage_path)
    )
      throw new Error("照片路径无效");
    const url = new URL(p.download_url);
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      throw new Error("仅允许 HTTPS 或本地测试地址");
    const target = path.resolve(root, p.storage_path);
    if (!target.startsWith(root + path.sep)) throw new Error("备份路径越界");
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`下载失败 ${response.status}（链接可能已过期）`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    console.log(`已保存 ${p.storage_path}`);
  } catch (e) {
    failed++;
    console.error(`${p.storage_path}: ${e.message}`);
  }
}
if (failed) process.exitCode = 1;
