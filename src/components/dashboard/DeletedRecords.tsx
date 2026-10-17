"use client";
import { useState } from "react";
import { useResource } from "../resource";
import { Feedback } from "../Feedback";
import { api } from "@/lib/client";
import { workingSets, type Session } from "@/lib/domain";
import { TRAINING_PAGE_SIZE, trainingPaths } from "@/lib/training-queries";
export function DeletedRecords({ date }: { date: string }) {
  const [page, setPage] = useState(0);
  const source = useResource<Session[]>(trainingPaths.deleted(date, page));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Feedback
        error={source.error || error}
        loading={source.loading || busy}
      />
      {!source.loading && !source.error && !source.data?.length && (
        <p>这一天没有已删除的训练。</p>
      )}
      {source.data?.slice(0, TRAINING_PAGE_SIZE).map((s) => (
        <div className="entry" key={s.id}>
          <p>
            {s.exercises.map((e) => e.exercise_name).join("、") || "未添加动作"}{" "}
            · {workingSets(s)} 个正式组
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api(
                  "sessions",
                  { id: s.id, revision: s.revision, restore: true },
                  "PATCH",
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "恢复失败，请重试");
              } finally {
                setBusy(false);
              }
            }}
          >
            恢复训练
          </button>
        </div>
      ))}
      {(page > 0 || (source.data?.length ?? 0) > TRAINING_PAGE_SIZE) && (
        <div className="row">
          <button disabled={!page} onClick={() => setPage(page - 1)}>
            上一页
          </button>
          <span>第 {page + 1} 页</span>
          <button
            disabled={(source.data?.length ?? 0) <= TRAINING_PAGE_SIZE}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </>
  );
}
