import test from "node:test";
import assert from "node:assert/strict";
import { avatarSchema } from "../src/lib/account-avatar";

test("avatar metadata rejects external URLs, SVG, disguised payloads and oversized thumbnails", () => {
  for (const value of [
    "https://example.com/avatar.png",
    "data:image/svg+xml;base64,PHN2Zz4=",
    "data:image/webp;base64,PHN2Zz4=",
    `data:image/webp;base64,${"A".repeat(4000)}`,
  ]) {
    assert.equal(avatarSchema.safeParse(value).success, false);
  }
  const header = Buffer.from("RIFF\x04\x00\x00\x00WEBPVP8 ", "binary");
  assert.equal(
    avatarSchema.safeParse(
      `data:image/webp;base64,${header.toString("base64")}`,
    ).success,
    true,
  );
});
