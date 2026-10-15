"use client";
import { useState } from "react";
import { useResource } from "../resource";
import { Feedback } from "../Feedback";
import { api } from "@/lib/client";
import { workingSets, type Session } from "@/lib/domain";
export function DeletedRecords({
  date,
  reload,
}: {
  date: string;
  reload: () => void;
}) {
  const source = useResource<Session[]>(
    `sessions?from=${date}&to=${date}&deleted=1`,
  );
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
      {source.data?.map((s) => (
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
                source.reload();
                reload();
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
    </>
  );
}
