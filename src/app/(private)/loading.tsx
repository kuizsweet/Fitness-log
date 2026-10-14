export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      正在打开页面…
      <div className="page-loading-skeleton" aria-hidden="true" />
    </div>
  );
}
