import test from "node:test";
import assert from "node:assert/strict";
import { MeasurementEditor } from "../src/lib/measurement-editor";
import { type BodyMeasurement } from "../src/lib/body-goals";
const make = (
  value: number,
  id = crypto.randomUUID(),
  time = Date.now(),
): BodyMeasurement => ({
  id,
  metric: "body_fat",
  value,
  measured_at: new Date(time).toISOString(),
  source: "manual",
  source_record_id: id,
});
test("目前测量防抖、串行写入，旧响应不会清除新输入", async () => {
  const sent: number[] = [];
  let release: (m: BodyMeasurement) => void = () => {};
  const editor = new MeasurementEditor(
    { read: () => null, write: () => {} },
    async (p) => {
      sent.push(p.value);
      if (sent.length === 1)
        return new Promise((resolve) => {
          release = resolve;
        });
      assert.equal(p.expected_value, 17.8);
      return make(p.value, p.id);
    },
    () => {},
    () => crypto.randomUUID(),
  );
  editor.receive([make(18)]);
  editor.edit("body_fat", "17.");
  editor.edit("body_fat", "17.8");
  assert.equal(sent.length, 0);
  await new Promise((r) => setTimeout(r, 380));
  assert.deepEqual(sent, [17.8]);
  editor.edit("body_fat", "17.5");
  release(make(17.8));
  // The same drain serializes a newer edit after acknowledgement.
  await new Promise((r) => setTimeout(r, 20));
  await editor.flush();
  assert.deepEqual(sent, [17.8, 17.5]);
  assert.equal(editor.getSnapshot().drafts.body_fat, undefined);
  assert.equal(editor.getSnapshot().measurements[0].value, 17.5);
});
test("测量失败后刷新保留原 mutation ID；未知响应晚于新测量时不回退", async () => {
  let raw = "",
    id = "";
  const storage = {
    read: () => raw || null,
    write: (v: string) => {
      raw = v;
    },
  };
  const first = new MeasurementEditor(
    storage,
    async (p) => {
      id = p.id;
      throw new Error("offline");
    },
    () => {},
    () => crypto.randomUUID(),
  );
  first.edit("body_fat", "17");
  await first.flush();
  assert.match(first.getSnapshot().error, /输入已保留/);
  let confirmed = 0;
  const second = new MeasurementEditor(
    storage,
    async (p) => {
      assert.equal(p.id, id);
      return make(17, p.id, Date.now() - 10000);
    },
    (m) => {
      confirmed = m.value;
    },
    () => crypto.randomUUID(),
  );
  second.receive([make(16)]);
  await second.flush();
  assert.equal(confirmed, 16);
  assert.equal(second.getSnapshot().measurements[0].value, 16);
  assert.equal(second.getSnapshot().drafts.body_fat, undefined);
});
test("目前值不推测空基准，不提交空白和非法值；冲突须显式重试", async () => {
  let attempts = 0;
  const editor = new MeasurementEditor(
    { read: () => null, write: () => {} },
    async (p) => {
      attempts++;
      if (attempts === 1) {
        assert.equal(p.expected_value, null);
        throw new Error("版本冲突");
      }
      assert.equal(p.expected_value, 18);
      return make(p.value, p.id);
    },
    () => {},
    () => crypto.randomUUID(),
  );
  editor.edit("body_fat", "");
  await editor.flush();
  editor.edit("body_fat", "101");
  await editor.flush();
  assert.equal(attempts, 0);
  editor.edit("body_fat", "17");
  editor.receive([make(18)]);
  editor.edit("body_fat", "16.5");
  await editor.flush();
  assert.equal(editor.getSnapshot().conflict, true);
  await editor.flush();
  assert.equal(attempts, 1);
  await editor.retry([make(18)]);
  assert.equal(attempts, 2);
});
