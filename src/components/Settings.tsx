"use client";
import { useState } from "react";
import { useResource } from "./resource";
import { api } from "@/lib/client";
import type { Profile } from "@/lib/domain";
import { Feedback } from "./Feedback";
export function Settings({ embedded = false }: { embedded?: boolean }) {
  const profile = useResource<Profile>("profile");
  return (
    <>
      {!embedded && <h1>设置</h1>}
      <Feedback error={profile.error} loading={profile.loading} />
      {profile.data && (
        <SettingsForm
          key={`${profile.data.timezone}:${profile.data.unit}`}
          profile={profile.data}
          reload={profile.reload}
        />
      )}
    </>
  );
}

function SettingsForm({
  profile,
  reload,
}: {
  profile: Profile;
  reload: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <>
      <form
        className="stack narrow"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("profile", draft);
            setMessage("设置已保存");
            reload();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          称呼
          <input
            maxLength={80}
            value={draft.display_name}
            onChange={(e) =>
              setDraft({ ...draft, display_name: e.target.value })
            }
          />
        </label>
        <label>
          默认重量单位
          <select
            value={draft.unit}
            onChange={(e) =>
              setDraft({ ...draft, unit: e.target.value as Profile["unit"] })
            }
          >
            <option>kg</option>
            <option>lb</option>
          </select>
        </label>
        <label>
          日期时区（IANA 名称）
          <input
            required
            value={draft.timezone}
            onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
            list="timezones"
          />
          <datalist id="timezones">
            {[
              "Asia/Shanghai",
              "Asia/Tokyo",
              "Europe/London",
              "America/New_York",
              "America/Los_Angeles",
              "UTC",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </datalist>
        </label>
        <small>
          单位设置只影响新组。历史组保留原单位，不自动换算。日期保持原记录日期。
        </small>
        <button disabled={busy} className="primary">
          保存设置
        </button>
      </form>
      <a href="/auth?mode=reset">重置密码</a>
      <Feedback error={error} loading={busy} message={message} />
    </>
  );
}
