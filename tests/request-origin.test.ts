import test from "node:test";
import assert from "node:assert/strict";
import { trustedRequestOrigin } from "../src/lib/request-origin";
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
