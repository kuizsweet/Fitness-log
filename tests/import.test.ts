import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  parseExpression,
  mapSheet,
  importRowSchema,
  parseDate,
} from "../src/lib/import/parser";
import { readWorkbook, guardXlsx } from "../src/lib/import/workbook";
import { importSessions } from "../src/lib/import/convert";
test("常见表达不把次数误当组数", () => {
  assert.deepEqual(parseExpression("15kg × 4组 × 8次"), {
    weight: 15,
    unit: "kg",
    sets: 4,
    reps: 8,
  });
  assert.deepEqual(parseExpression("17.5kg × 4次"), {
    weight: 17.5,
    unit: "kg",
    sets: 1,
    reps: 4,
  });
  assert.deepEqual(parseExpression("40kg*8"), {
    weight: 40,
    unit: "kg",
    sets: 1,
    reps: 8,
  });
  assert.equal(parseExpression("15或20kg"), null);
  assert.equal(parseDate("10/13"), null);
});
test("真实工作簿解析：合并日期、多行表头、多日期、图片报告", async () => {
  const book = new ExcelJS.Workbook();
  const ws = book.addWorksheet("训练");
  ws.addRow(["训练记录"]);
  ws.addRow(["日期", "动作", "重量", "备注"]);
  ws.addRow([
    new Date("2026-01-01T00:00:00Z"),
    "卧推",
    "15kg × 4组 × 8次",
    "计划实际需核对",
  ]);
  ws.addRow(["", "推肩", "17.5kg × 4次", ""]);
  ws.mergeCells("A3:A4");
  ws.addRow(["2026年1月2日", "划船", "40kg*8", ""]);
  const id = book.addImage({
    base64:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1sAAAAASUVORK5CYII=",
    extension: "png",
  });
  ws.addImage(id, { tl: { col: 3, row: 2 }, ext: { width: 20, height: 20 } });
  const data = await readWorkbook(Buffer.from(await book.xlsx.writeBuffer()));
  assert.equal(data.sheets[0].header, 2);
  assert.equal(data.images.length, 1);
  assert.match(data.images[0].reason, /未导入/);
  const rows = mapSheet(
    data.sheets[0],
    data.sheets[0].mapping,
    2,
    "display",
    "actual",
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[1].date, "2026-01-01");
  assert.equal(rows[2].date, "2026-01-02");
  assert.equal(rows[0].sets, 4);
  assert.equal(rows[1].reps, 4);
});
test("歧义保持未确认，无效日期不能继承前一天", () => {
  const s = {
    name: "表",
    header: 1,
    mapping: { date: 0, exercise: 1, weight: 2 },
    rows: [
      { line: 2, cells: ["2026/1/1", "卧推", "15kg*8"] },
      { line: 3, cells: ["明天", "卧推", "未知"] },
    ],
  };
  const rows = mapSheet(s, s.mapping, 1);
  assert.equal(rows[0].mode, "unknown");
  assert.equal(rows[0].kind, "unknown");
  assert.equal(rows[1].date, "");
  assert.ok(rows[1].errors.length >= 3);
  assert.equal(rows[1].reps, null);
  assert.equal(rows[1].needs_weight_review, true);
  assert.equal(importRowSchema.safeParse(rows[0]).success, false);
});
test("计划与实际重量分别存储，同日不同类型不合并", () => {
  const base = {
    source: "表:2",
    date: "2026-01-01",
    exercise: "卧推",
    equipment: "杠铃",
    weight: 20,
    unit: "kg" as const,
    mode: "total" as const,
    reps: 8,
    sets: 2,
    notes: "",
    role: "work" as const,
    tags: [],
  };
  const sessions = importSessions([
    { ...base, kind: "planned" },
    { ...base, source: "表:3", kind: "actual" },
  ]);
  assert.equal(sessions.length, 2);
  const planned = sessions.find((s) => s.status === "planned")!.exercises[0]
    .sets[0];
  assert.equal(planned.weight.value, null);
  assert.equal(planned.planned_weight!.value, 20);
  assert.equal(planned.completed, false);
  assert.equal(
    sessions.find((s) => s.status === "completed")!.exercises[0].sets.length,
    2,
  );
});
test("拒绝伪装 xlsx 与解压超限文件", () => {
  assert.throws(() => guardXlsx(Buffer.from("not a workbook")), /有效/);
  const b = Buffer.alloc(68);
  b.writeUInt32LE(0x02014b50, 0);
  b.writeUInt32LE(31 * 1024 * 1024, 24);
  b.writeUInt32LE(0x06054b50, 46);
  b.writeUInt16LE(1, 56);
  assert.throws(() => guardXlsx(b), /30 MB/);
});
