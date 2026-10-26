import test from "node:test";
import assert from "node:assert/strict";
import {
  callbackRequestOrigin,
  trustedRequestOrigin,
} from "../src/lib/request-origin";

test("本地认证回调保留浏览器域名，不跳到线上丢失验证cookie", () => {
  const canonical = "https://kuizfit.cc.cd";
  for (const host of ["localhost:3003", "127.0.0.1:3003"]) {
    assert.equal(
      callbackRequestOrigin(
        new Request("http://0.0.0.0:3003/auth/callback", {
          headers: { host },
        }),
        canonical,
      ),
      `http://${host}`,
    );
  }
  assert.equal(
    callbackRequestOrigin(
      new Request("https://kuizfit.cc.cd/auth/callback"),
      canonical,
    ),
    canonical,
  );
  assert.equal(
    callbackRequestOrigin(
      new Request("http://0.0.0.0:3003/auth/callback", {
        headers: { host: "attacker.example:3003" },
      }),
      canonical,
    ),
    canonical,
  );
});
test("开发及生产本地预览均匹配实际回环Host/协议/端口，远程来源保持严格检查", () => {
  const request = (origin: string, host = "localhost:3001") =>
    new Request("http://0.0.0.0:3001/api/body", { headers: { origin, host } });
  assert.equal(
    trustedRequestOrigin(request("http://localhost:3001"), undefined, true),
    true,
  );
  assert.equal(
    trustedRequestOrigin(request("http://localhost:3001"), undefined, false),
    true,
  );
  assert.equal(
    trustedRequestOrigin(request("http://localhost:3000"), undefined, true),
    false,
  );
  assert.equal(
    trustedRequestOrigin(request("https://localhost:3001"), undefined, true),
    false,
  );
  assert.equal(
    trustedRequestOrigin(
      request("http://attacker.example:3001", "attacker.example:3001"),
      undefined,
      true,
    ),
    false,
  );
  assert.equal(
    trustedRequestOrigin(
      request("https://kuizfit.cc.cd"),
      "https://kuizfit.cc.cd",
      false,
    ),
    true,
  );
  for (const development of [true, false]) {
    assert.equal(
      trustedRequestOrigin(
        request("http://localhost:3001", "other.example:3001"),
        undefined,
        development,
      ),
      false,
    );
    assert.equal(
      trustedRequestOrigin(
        request("http://localhost:3002"),
        undefined,
        development,
      ),
      false,
    );
    assert.equal(
      trustedRequestOrigin(
        request("http://attacker.example:3001", "attacker.example:3001"),
        undefined,
        development,
      ),
      false,
    );
    assert.equal(
      trustedRequestOrigin(
        new Request("http://0.0.0.0:3001/api/photos", {
          headers: { host: "localhost:3001" },
        }),
        undefined,
        development,
      ),
      false,
    );
  }
});
