export function Feedback({
  error,
  message,
  loading,
}: {
  error?: string;
  message?: string;
  loading?: boolean;
}) {
  return (
    <>
      {loading && <p role="status">正在加载 / 保存…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </>
  );
}
