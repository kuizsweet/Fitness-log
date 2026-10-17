import test from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { resourceKey } from "../src/lib/resource-keys";
import { applyResourceChange } from "../src/lib/training-cache";
import { trainingPaths } from "../src/lib/training-queries";
import { newSession, type Session } from "../src/lib/domain";
import { primeTrainingDetails } from "../src/lib/query-cache";

test("查询键规范化参数顺序，同时隔离用户与筛选条件", () => {
  assert.deepEqual(
    resourceKey("a", "sessions?to=2&from=1"),
    resourceKey("a", "sessions?from=1&to=2"),
  );
  assert.notDeepEqual(resourceKey("a", "profile"), resourceKey("b", "profile"));
  assert.notDeepEqual(
    resourceKey("a", trainingPaths.plans()),
    resourceKey("a", trainingPaths.plans(1)),
  );
});

test("已读取的当天记录复用为详情缓存，旧列表不能覆盖较新详情", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 60000 } },
  });
  try {
    const s = { ...newSession("2026-10-17"), revision: 2 };
    primeTrainingDetails(client, "a", trainingPaths.day(s.training_date), [s]);
    let requests = 0;
    const data = await client.fetchQuery({
      queryKey: resourceKey("a", trainingPaths.detail(s.id)),
      queryFn: async () => {
        requests++;
        return [s];
      },
    });
    assert.equal(requests, 0, "打开已有当天记录不再请求同一详情");
    assert.equal(data[0].revision, 2);
    primeTrainingDetails(client, "a", trainingPaths.plans(), [
      { ...s, revision: 1 },
    ]);
    assert.equal(
      client.getQueryData<Session[]>(
        resourceKey("a", trainingPaths.detail(s.id)),
      )?.[0].revision,
      2,
    );
    assert.equal(
      client.getQueryData(resourceKey("b", trainingPaths.detail(s.id))),
      undefined,
    );
  } finally {
    client.clear();
  }
});

test("保存后同步当天/计划/详情/月历，删除移除、恢复回填且旧账号响应不能写入新缓存", async () => {
  const client = new QueryClient();
  try {
    const s: Session = {
      ...newSession("2026-10-17"),
      status: "planned",
      training_type: "strength",
    };
    const day = resourceKey("a", trainingPaths.day(s.training_date));
    const plans = resourceKey("a", trainingPaths.plans());
    const cal = resourceKey(
      "a",
      trainingPaths.calendar("2026-10-01", "2026-10-31"),
    );
    for (const key of [day, plans, cal]) client.setQueryData(key, []);
    const post = {
      owner: "a",
      resource: "sessions",
      method: "POST",
      data: s,
      result: { revision: 1 },
    };
    await applyResourceChange(client, "a", post);
    assert.equal(client.getQueryData<Session[]>(day)?.[0].id, s.id);
    assert.equal(client.getQueryData<Session[]>(plans)?.[0].id, s.id);
    assert.equal(
      client.getQueryData<Session[]>(
        resourceKey("a", trainingPaths.detail(s.id)),
      )?.[0].revision,
      1,
    );
    const finished = { ...s, revision: 1, status: "completed" };
    await applyResourceChange(client, "a", {
      ...post,
      data: finished,
      result: { revision: 2 },
    });
    assert.equal(client.getQueryData<Session[]>(plans)?.length, 0);
    assert.equal(client.getQueryData<Session[]>(day)?.[0].status, "completed");
    const patch = {
      owner: "a",
      resource: "sessions",
      method: "PATCH",
      data: { id: s.id, revision: 2, restore: false },
      result: { revision: 3 },
    };
    await applyResourceChange(client, "a", patch);
    assert.equal(client.getQueryData<Session[]>(day)?.length, 0);
    const deleted = resourceKey("a", trainingPaths.deleted(s.training_date));
    client.setQueryData(deleted, [
      { ...s, revision: 3, deleted_at: new Date().toISOString() },
    ]);
    await applyResourceChange(client, "a", {
      ...patch,
      data: { id: s.id, revision: 3, restore: true },
      result: { revision: 4 },
    });
    assert.equal(client.getQueryData<Session[]>(day)?.[0].revision, 4);
    assert.equal(client.getQueryData<Session[]>(deleted)?.length, 0);
    await applyResourceChange(client, "b", post);
    assert.equal(
      client.getQueryData(resourceKey("b", trainingPaths.detail(s.id))),
      undefined,
    );
  } finally {
    client.clear();
  }
});

test("旧写入响应不得覆盖更高 revision，其他月份的缓存保持新鲜", async () => {
  const client = new QueryClient();
  try {
    const s = { ...newSession("2026-10-17"), revision: 3, notes: "newest" };
    const detail = resourceKey("a", trainingPaths.detail(s.id));
    client.setQueryData(detail, [s]);
    const other = resourceKey("a", trainingPaths.day("2026-09-01"));
    client.setQueryData(other, []);
    await applyResourceChange(client, "a", {
      owner: "a",
      resource: "sessions",
      method: "POST",
      data: { ...s, revision: 1, notes: "old" },
      result: { revision: 2 },
    });
    assert.equal(client.getQueryData<Session[]>(detail)?.[0].notes, "newest");
    assert.equal(client.getQueryState(other)?.isInvalidated, false);
  } finally {
    client.clear();
  }
});

test("写入成功先取消旧读取，晚到的旧响应不能覆盖新 revision", async () => {
  const client = new QueryClient();
  try {
    const s = { ...newSession("2026-10-17"), revision: 1 };
    const key = resourceKey("a", trainingPaths.detail(s.id));
    client.setQueryData(key, [s]);
    let resolve!: (rows: Session[]) => void;
    const old = client
      .fetchQuery({
        queryKey: key,
        queryFn: () =>
          new Promise<Session[]>((r) => {
            resolve = r;
          }),
        staleTime: 0,
      })
      .catch(() => undefined);
    await applyResourceChange(client, "a", {
      owner: "a",
      resource: "sessions",
      method: "POST",
      data: { ...s, notes: "new" },
      result: { revision: 2 },
    });
    resolve([s]);
    await old;
    assert.equal(client.getQueryData<Session[]>(key)?.[0].revision, 2);
    assert.equal(client.getQueryData<Session[]>(key)?.[0].notes, "new");
  } finally {
    client.clear();
  }
});
