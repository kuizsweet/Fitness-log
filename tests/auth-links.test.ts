import assert from "node:assert/strict";
import test from "node:test";
import {
  authCallbackUrl,
  authLinkFailureUrl,
  emailLinkError,
} from "../src/lib/auth-links";

test("production callbacks preserve the PKCE browser origin even when a canonical site is configured", () => {
  assert.equal(
    authCallbackUrl(
      "https://kuizfitcdcc.vercel.app",
      "https://kuizfit.cc.cd/dashboard",
    ),
    "https://kuizfitcdcc.vercel.app/auth/callback",
  );
  assert.equal(
    authCallbackUrl("https://kuizfit.cc.cd"),
    "https://kuizfit.cc.cd/auth/callback",
  );
});
test("localhost config cannot silently redirect production email to the user's own computer", () => {
  for (const url of [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost",
    "http://kuizfit.cc.cd",
  ])
    assert.throws(() => authCallbackUrl("https://kuizfit.cc.cd", url));
});
test("local development remains local and recovery return paths remain confined", () => {
  assert.equal(
    authCallbackUrl("http://localhost:3000", "https://kuizfit.cc.cd"),
    "http://localhost:3000/auth/callback",
  );
  const recovery = new URL(
    authCallbackUrl("https://kuizfit.cc.cd", undefined, true),
  );
  assert.equal(recovery.pathname, "/auth/callback");
  assert.equal(recovery.searchParams.get("next"), "/auth?mode=update");
  const localRecovery = new URL(
    authCallbackUrl("http://localhost:3000", "https://kuizfit.cc.cd", true),
  );
  assert.equal(localRecovery.origin, "http://localhost:3000");
  assert.equal(localRecovery.searchParams.get("next"), "/auth?mode=update");
});
test("failed recovery returns to the reset request form without preserving credentials", () => {
  for (const origin of ["http://localhost:3000", "https://kuizfit.cc.cd"]) {
    const url = authLinkFailureUrl(origin, true);
    assert.equal(url.origin, origin);
    assert.equal(url.pathname, "/auth");
    assert.equal(url.searchParams.get("mode"), "reset");
    assert.deepEqual([...url.searchParams.keys()].sort(), ["error", "mode"]);
  }
  assert.equal(
    authLinkFailureUrl("https://kuizfit.cc.cd").searchParams.get("error"),
    emailLinkError,
  );
});
