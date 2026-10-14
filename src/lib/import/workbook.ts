import ExcelJS from "exceljs";
import {
  fields,
  aliases,
  type Workbook,
  type Sheet,
  type ImageNotice,
  type Mapping,
} from "./parser";
// Guard compressed input using ZIP central-directory metadata BEFORE decoding workbook XML.
export function guardXlsx(bytes: Buffer) {
  if (!bytes.length || bytes.length > 3 * 1024 * 1024)
    throw new Error("工作簿需小于 3 MB");
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new Error("不是有效的 .xlsx 文件");
  const count = bytes.readUInt16LE(end + 10);
  let pos = bytes.readUInt32LE(end + 16);
  let total = 0;
  if (count > 2000 || count === 65535)
    throw new Error("工作簿文件条目过多，或使用了不支持的 ZIP64");
  for (let i = 0; i < count; i++) {
    if (pos + 46 > bytes.length || bytes.readUInt32LE(pos) !== 0x02014b50)
      throw new Error("工作簿压缩结构无效");
    total += bytes.readUInt32LE(pos + 24);
    if (total > 30 * 1024 * 1024)
      throw new Error("工作簿解压体积超过 30 MB，请拆分文件");
    pos +=
      46 +
      bytes.readUInt16LE(pos + 28) +
      bytes.readUInt16LE(pos + 30) +
      bytes.readUInt16LE(pos + 32);
  }
}
function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v && typeof v === "object" && "formula" in v)
    return v.result === undefined ? "" : String(v.result);
  return cell.text.trim();
}
export async function readWorkbook(bytes: Buffer): Promise<Workbook> {
  guardXlsx(bytes);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(
    bytes as unknown as Parameters<typeof book.xlsx.load>[0],
  );
  const sheets: Sheet[] = [];
  const images: ImageNotice[] = [];
  const warnings: string[] = [];
  for (const sheet of book.worksheets) {
    if (sheet.rowCount > 5000 || sheet.columnCount > 80)
      throw new Error(`${sheet.name} 超过 5000 行 / 80 列，请拆分后导入`);
    const rows: Sheet["rows"] = [];
    sheet.eachRow((row, line) => {
      const cells: string[] = [];
      for (let col = 1; col <= sheet.columnCount; col++)
        cells.push(cellText(row.getCell(col)));
      rows.push({ line, cells });
    });
    let header = 0;
    let mapping: Mapping = {};
    let score = 0;
    for (const row of rows.slice(0, 12)) {
      const candidate: Mapping = {};
      fields.forEach((field) => {
        const found = row.cells.findIndex((c) =>
          aliases[field].includes(c.toLowerCase().replaceAll(" ", "")),
        );
        if (found >= 0) candidate[field] = found;
      });
      const n = Object.keys(candidate).length;
      if (n > score) {
        score = n;
        header = row.line;
        mapping = candidate;
      }
    }
    for (const image of sheet.getImages())
      images.push({
        sheet: sheet.name,
        anchor: `行 ${Math.floor(image.range.tl.row) + 1}，列 ${Math.floor(image.range.tl.col) + 1}`,
        reason:
          "已识别嵌入图片及锚点；没有可靠餐次绑定，未导入，请到对应日期手动上传。",
      });
    if (sheet.getBackgroundImageId())
      images.push({
        sheet: sheet.name,
        anchor: "工作表背景",
        reason: "背景图片没有日期及餐次绑定，未导入。",
      });
    if (rows.some((r) => r.cells.some((c) => /计划|目标|实际|完成/.test(c))))
      warnings.push(`${sheet.name} 包含计划/实际字样。请逐行确认记录类型。`);
    sheets.push({ name: sheet.name, rows, header, mapping });
  }
  // Also inventory media not represented by a drawing anchor (unsupported or orphan media).
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(bytes);
  const media = Object.keys(zip.files).filter((p) =>
    /^xl\/media\/[^/]+$/.test(p),
  );
  if (media.length > images.length)
    for (let i = images.length; i < media.length; i++)
      images.push({
        sheet: "未知",
        anchor: media[i],
        reason: "工作簿媒体没有可读取锚点，未导入。",
      });
  return { sheets, images, warnings };
}
