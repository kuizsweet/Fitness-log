import test from "node:test";
import assert from "node:assert/strict";
import { checkinRankings } from "../src/lib/checkins";

test("Trophy 展示适配保留并列名次、精确天数和本人，不填等级或虚构头像", () => {
  const rows = [
    { rank: 1, display_name: "同名", streak: 1200, is_self: false },
    { rank: 1, display_name: "同名", streak: 1200, is_self: true },
    { rank: 3, display_name: "另一位", streak: 9, is_self: false },
  ];
  const original = structuredClone(rows);
  const view = checkinRankings(rows);
  assert.deepEqual(
    view.rankings.map((row) => [row.rank, row.value]),
    [
      [1, 1200],
      [1, 1200],
      [3, 9],
    ],
  );
  assert.equal(new Set(view.rankings.map((row) => row.userId)).size, 3);
  assert.equal(view.currentUserId, view.rankings[1].userId);
  assert.ok(
    view.rankings.every((row) => !("byline" in row) && !("avatarUrl" in row)),
  );
  assert.deepEqual(rows, original);
  assert.equal(checkinRankings([]).currentUserId, undefined);
});
