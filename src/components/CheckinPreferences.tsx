"use client";
// Retained for the future Settings integration; not mounted on the leaderboard.
import { useState } from "react";
import { api } from "@/lib/client";
import type { CheckinDashboard } from "@/lib/checkins";
import { Feedback } from "./Feedback";
import styles from "./CheckinPreferences.module.css";

export function CheckinPreferences({
  data,
  reload,
}: {
  data: CheckinDashboard;
  reload: () => void;
}) {
  const [listed, setListed] = useState(data.listed);
  const [name, setName] = useState(data.display_name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = listed !== data.listed || name.trim() !== data.display_name;
  return (
    <section
      className={styles.panel}
      id="visibility"
      aria-labelledby="visibility-title"
    >
      <h2 id="visibility-title">上榜设置</h2>
      <form
        className={styles.preferences}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("checkins", {
              action: "preferences",
              listed,
              display_name: name,
            });
            reload();
          } catch (e) {
            setError(e instanceof Error ? e.message : "保存失败");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className={styles.toggle}>
          <span>参与上榜</span>
          <input
            type="checkbox"
            role="switch"
            checked={listed}
            disabled={busy}
            onChange={(e) => setListed(e.target.checked)}
          />
        </label>
        <label>
          榜单昵称
          <input
            value={name}
            required={listed}
            maxLength={40}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button disabled={busy || !changed}>
          {busy ? "保存中…" : "保存设置"}
        </button>
      </form>
      <Feedback error={error} />
    </section>
  );
}
