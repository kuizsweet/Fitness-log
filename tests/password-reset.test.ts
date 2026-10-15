import assert from "node:assert/strict";
import test from "node:test";
import { passwordResetError } from "../src/lib/password-reset";

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
