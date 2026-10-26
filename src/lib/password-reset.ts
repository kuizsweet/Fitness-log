export function passwordResetError(password: string, confirmation: string) {
  if (password.length < 8) return "新密码至少需要 8 位。";
  if (password !== confirmation) return "两次输入的密码不一致，请重新确认。";
  return null;
}

export function passwordUpdateFailure(error: {
  status?: number;
  code?: string;
  name?: string;
}) {
  if (
    error.name === "AuthRetryableFetchError" ||
    !error.status ||
    error.status >= 500
  )
    return { status: 503, message: "暂时无法连接账号服务，请稍后重试。" };
  if (
    [
      "session_not_found",
      "refresh_token_not_found",
      "refresh_token_already_used",
      "bad_jwt",
    ].includes(error.code ?? "") ||
    error.status === 401 ||
    error.name === "AuthSessionMissingError"
  )
    return {
      status: 401,
      message: "验证会话已失效，请重新发送重置邮件，并在同一浏览器打开。",
    };
  if (error.code === "same_password")
    return { status: 400, message: "新密码不能与原密码相同。" };
  if (error.code === "weak_password")
    return { status: 400, message: "新密码强度不足，请换一个密码。" };
  if (error.status === 429)
    return { status: 429, message: "操作过于频繁，请稍后重试。" };
  return { status: 400, message: "新密码未能保存，请稍后重试。" };
}
