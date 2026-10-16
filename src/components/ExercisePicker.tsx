"use client";
import { useRef, useState } from "react";
import { exerciseSchema, type Exercise } from "@/lib/domain";
import { exercisePresets } from "@/lib/presets";
import { api } from "@/lib/client";
import { Feedback } from "./Feedback";
import styles from "./Training.module.css";

export function ExercisePicker({
  exercises,
  disabled,
  add,
  reload,
}: {
  exercises: Exercise[];
  disabled: boolean;
  add: (ex: Exercise) => void;
  reload: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState("");
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const available = exercises.filter((e) => !e.hidden && !e.deleted_at);
  const presets = exercisePresets.filter(
    (p) => !exercises.some((e) => !e.deleted_at && e.name.trim() === p.name),
  );
  const matches = (e: { name: string; muscle_group: string }) =>
    (!muscle || e.muscle_group === muscle) &&
    `${e.name} ${e.muscle_group}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase());
  function choose(ex: Exercise) {
    add(ex);
    dialog.current?.close();
  }
  async function create(item: { name: string; muscle_group: string }) {
    setBusy(true);
    setError("");
    try {
      const existing = available.find(
        (e) => e.name.trim() === item.name.trim(),
      );
      if (existing) {
        choose(existing);
        return;
      }
      const ex = exerciseSchema.parse({
        ...item,
        id: crypto.randomUUID(),
        notes: "",
        hidden: false,
      });
      await api("catalog", { kind: "exercises", item: ex });
      reload();
      choose(ex);
      setCustom(false);
      setName("");
      setGroup("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存动作失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        disabled={disabled}
        onClick={() => {
          setError("");
          dialog.current?.showModal();
        }}
      >
        添加动作
      </button>
      <dialog
        ref={dialog}
        className={styles.picker}
        aria-labelledby="exercise-picker-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <header>
          <h2 id="exercise-picker-title">添加动作</h2>
          <button
            type="button"
            disabled={busy}
            aria-label="关闭动作选择"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </header>
        <fieldset disabled={busy}>
          <div className="row">
            <label>
              搜索
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              肌群
              <select
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
              >
                <option value="">全部肌群</option>
                {[
                  ...new Set(
                    [...available, ...presets]
                      .map((e) => e.muscle_group)
                      .filter(Boolean),
                  ),
                ].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.pickerList}>
            {available.filter(matches).map((ex) => (
              <button type="button" key={ex.id} onClick={() => choose(ex)}>
                <span>{ex.name}</span>
                <small>{ex.muscle_group}</small>
              </button>
            ))}
            {presets.filter(matches).map((ex) => (
              <button
                type="button"
                key={ex.name}
                onClick={() => void create(ex)}
              >
                <span>{ex.name}</span>
                <small>{ex.muscle_group} · 添加预设</small>
              </button>
            ))}
            {![...available, ...presets].some(matches) && (
              <p className={styles.muted}>没有匹配的动作</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setCustom(!custom);
              setName(search);
            }}
          >
            自定义动作
          </button>
          {custom && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void create({ name, muscle_group: group });
              }}
            >
              <label>
                动作名称
                <input
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                肌群
                <input
                  maxLength={60}
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                />
              </label>
              <button className="primary" disabled={busy || !name.trim()}>
                保存并添加
              </button>
            </form>
          )}
        </fieldset>
        <Feedback error={error} />
        {busy && <p role="status">正在保存动作…</p>}
      </dialog>
    </>
  );
}
