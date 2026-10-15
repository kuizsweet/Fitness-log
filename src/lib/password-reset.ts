export function passwordResetError(password: string, confirmation: string) {
  if (password.length < 8) return "新密码至少需要 8 位。";
  if (password !== confirmation) return "两次输入的密码不一致，请重新确认。";
  return null;
}
