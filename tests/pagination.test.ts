import test from "node:test";
import assert from "node:assert/strict";
import { allRows } from "../src/lib/pagination";
test("超过 PostgREST 默认上限时完整分页，不静默截断", async () => {
  const rows = Array.from({ length: 1205 }, (_, i) => ({ id: i }));
  const ranges: number[][] = [];
  const output = await allRows({
    range: async (from, to) => {
      ranges.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    },
  });
  assert.equal(output.length, 1205);
  assert.equal(output.at(-1)!.id, 1204);
  assert.deepEqual(ranges, [
    [0, 499],
    [500, 999],
    [1000, 1499],
  ]);
});
