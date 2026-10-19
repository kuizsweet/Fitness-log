import { test } from "node:test";
import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { ApiResponseError } from "../src/lib/client";
import { retryResourceRead } from "../src/lib/query-cache";

test("暂时连接失败自动恢复读取；不重试鉴权或版本冲突", async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: retryResourceRead, retryDelay: 0, gcTime: 0 },
    },
  });
  let calls = 0;
  const data = await client.fetchQuery({
    queryKey: ["calendar"],
    queryFn: async () => {
      if (++calls < 3) throw new ApiResponseError("连接中断", 503);
      return [{ date: "2026-10-18", mode: "strength" }];
    },
  });
  assert.equal(calls, 3);
  assert.equal(data[0].mode, "strength");
  assert.equal(
    retryResourceRead(0, new ApiResponseError("请登录", 401)),
    false,
  );
  assert.equal(
    retryResourceRead(0, new ApiResponseError("版本冲突", 409)),
    false,
  );
  await assert.rejects(
    client.fetchQuery({
      queryKey: ["calendar"],
      queryFn: async () => {
        throw new TypeError("Failed to fetch");
      },
    }),
  );
  assert.deepEqual(client.getQueryData(["calendar"]), data);
  client.clear();
});
