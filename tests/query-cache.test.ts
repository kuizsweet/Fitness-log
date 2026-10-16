import test from "node:test";
import assert from "node:assert/strict";
import { userQueryClient, clearUserCache } from "../src/lib/query-cache";
test("资源并发去重、缓存复用与切换账号隔离", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: { removeItem() {} },
    });
    const a = userQueryClient("test-a");
    let reads = 0;
    const load = () =>
      a.fetchQuery({
        queryKey: ["same-resource"],
        queryFn: async () => {
          reads++;
          return { revision: 1 };
        },
      });
    await Promise.all([load(), load(), load()]);
    assert.equal(reads, 1);
    await load();
    assert.equal(reads, 1);
    assert.equal(userQueryClient("test-a"), a);
    const b = userQueryClient("test-b");
    assert.equal(b.getQueryData(["same-resource"]), undefined);
    assert.equal(a.getQueryData(["same-resource"]), undefined);
    clearUserCache();
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
    if (storage) Object.defineProperty(globalThis, "sessionStorage", storage);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
