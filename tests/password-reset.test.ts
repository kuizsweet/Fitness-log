import assert from "node:assert/strict";
import test from "node:test";
import { passwordResetError, passwordUpdateFailure } from "../src/lib/password-reset";

test("网络故障不能误报为链接过期", () => {
  assert.equal(passwordUpdateFailure({ name: "AuthRetryableFetchError", status: 0 }).status, 503);
  assert.equal(passwordUpdateFailure({ status: 502 }).status, 503);
  assert.equal(passwordUpdateFailure({ name: "AuthSessionMissingError", status: 400 }).status, 401);
  assert.equal(passwordUpdateFailure({ code: "bad_jwt", status: 403 }).status, 401);
  assert.equal(passwordUpdateFailure({ code: "same_password", status: 422 }).message, "新密码不能与原密码相同。");
});

test("password reset rejects short passwords even when confirmation matches", () => {
  for (const password of ["", "1234567"])
    assert.equal(
      passwordResetError(password, password),
      "新密码至少需要 8 位。",
    );
});
test("password reset requires an exact confirmation without trimming", () => {
  for (const confirmation of ["", "Different123", "Valid123 "])
    assert.equal(
      passwordResetError("Valid123", confirmation),
      "两次输入的密码不一致，请重新确认。",
    );
  assert.equal(
    passwordResetError(" Valid123 ", "Valid123"),
    "两次输入的密码不一致，请重新确认。",
  );
});
test("password reset accepts matching passwords at and above the existing minimum", () => {
  for (const password of ["Valid123", " Longer-password "])
    assert.equal(passwordResetError(password, password), null);
});
