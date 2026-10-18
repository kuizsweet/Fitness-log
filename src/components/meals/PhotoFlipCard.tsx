"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw, Trash2, RefreshCw, Check } from "lucide-react";
import { api } from "@/lib/client";
import type { MealPhoto } from "@/lib/domain";
import styles from "../MealsPage.module.css";

export function PhotoFlipCard({
  photo,
  label,
  canSave,
  onChanged,
  onReplace,
}: {
  photo: MealPhoto;
  label: string;
  canSave: boolean;
  onChanged: () => void;
  onReplace?: (file: File) => Promise<void>;
}) {
  const [flipped, setFlipped] = useState(false);
  const [notes, setNotes] = useState(photo.notes ?? "");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const front = useRef<HTMLButtonElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!dirty && !saved) setNotes(photo.notes ?? "");
  }, [photo.notes, dirty, saved]);
  async function save() {
    if (!canSave || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("photos", { id: photo.id, notes }, "PATCH");
      setDirty(false);
      setSaved(true);
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(restore = false) {
    setBusy(true);
    setError("");
    try {
      await api("photos", { id: photo.id, restore }, "PATCH");
      setDeleted(!restore);
      if (restore) onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (deleted)
    return (
      <div className={styles.deleted}>
        照片已移除
        <button disabled={busy} onClick={() => void remove(true)}>
          撤销
        </button>
        <button onClick={onChanged}>完成</button>
      </div>
    );
  return (
    <article
      className={styles.photoCard}
      data-flipped={flipped || undefined}
      aria-label={label}
    >
      <div className={styles.flipper}>
        <div className={styles.front} inert={flipped} aria-hidden={flipped}>
          <button
            ref={front}
            className={styles.photoButton}
            aria-label={`翻转${label}，编辑备注`}
            aria-expanded={flipped}
            onClick={() => {
              setFlipped(true);
              requestAnimationFrame(() =>
                editor.current?.focus({ preventScroll: true }),
              );
            }}
          >
            {/* Private signed image URL must not be sent to an image optimization proxy. */}
            <img src={photo.url} alt={label} loading="lazy" />
            <span className={styles.photoCaption}>
              {label}
              <RotateCcw size={16} />
            </span>
          </button>
        </div>
        <div
          className={styles.back}
          inert={!flipped}
          aria-hidden={!flipped}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setFlipped(false);
              front.current?.focus();
            }
          }}
        >
          <header>
            <span>{label}</span>
            <button
              aria-label="翻回照片"
              onClick={() => {
                setFlipped(false);
                front.current?.focus();
              }}
            >
              <RotateCcw size={16} />
            </button>
          </header>
          <textarea
            ref={editor}
            aria-label={`${label}的照片备注`}
            placeholder="这张照片，想记住什么？"
            maxLength={4000}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setDirty(true);
              setSaved(false);
            }}
          />
          {error && <p role="alert">{error}</p>}
          <footer>
            <button
              aria-label={`移除${label}`}
              disabled={busy}
              onClick={() => void remove()}
            >
              <Trash2 size={15} />
            </button>
            {onReplace && (
              <label className={styles.replace} title="替换照片">
                <RefreshCw size={15} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  aria-label={`替换${label}`}
                  disabled={busy}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    setBusy(true);
                    try {
                      await onReplace(file);
                    } catch (cause) {
                      setError((cause as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
            )}
            <button
              className={styles.saveNote}
              disabled={busy || !canSave || !dirty}
              onClick={() => void save()}
            >
              {busy ? (
                "保存中…"
              ) : saved ? (
                <>
                  <Check size={14} />
                  已保存
                </>
              ) : canSave ? (
                "保存备注"
              ) : (
                "备注保存待启用"
              )}
            </button>
          </footer>
        </div>
      </div>
    </article>
  );
}
