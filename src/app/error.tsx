"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main>
      <h1>页面暂时无法加载</h1>
      <p role="alert">
        网络或服务发生错误。尚未确认保存的修改可能没有提交，请恢复服务后核对记录。
      </p>
      <button onClick={reset}>重试</button>
      <p>
        <a href="/">返回首页</a>
      </p>
    </main>
  );
}
