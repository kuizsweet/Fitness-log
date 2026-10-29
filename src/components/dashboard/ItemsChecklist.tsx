"use client";
import { useEffect, useState, useRef, type ReactNode } from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import { ChecklistRows } from "./ChecklistRows";
import { Button } from "../ui/button";
import { useResourceUser } from "../ResourceProvider";
import {
  ITEM_LIMIT,
  appendChecklistItem,
  orderItems,
  readChecklist,
  checklistDay,
  toggleItem,
  addChecklistExamples,
  type ChecklistItem,
} from "@/lib/items-checklist";
import styles from "./ItemsChecklist.module.css";

export function ItemsChecklist({
  controls,
  active,
}: {
  controls: ReactNode;
  active: boolean;
}) {
  const user = useResourceUser();
  return (
    <Checklist key={user} user={user} controls={controls} active={active} />
  );
}
function Checklist({
  user,
  controls,
  active,
}: {
  user: string;
  controls: ReactNode;
  active: boolean;
}) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const [capacity, setCapacity] = useState(10);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const card = root.current?.closest("section");
    if (!card) return;
    function measure() {
      const style = getComputedStyle(card!);
      const available =
        card!.clientHeight -
        parseFloat(style.paddingTop) -
        parseFloat(style.paddingBottom) -
        2 -
        (controls ? 44 : 0) -
        (active && items.length < ITEM_LIMIT ? 40 : 0);
      const full = Math.max(1, Math.min(10, Math.floor(available / 40)));
      setCapacity(
        items.length > full
          ? Math.max(1, Math.floor((available - 26) / 40))
          : full,
      );
    }
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    measure();
    return () => observer.disconnect();
  }, [items.length, active, controls]);
  const pages = Math.max(1, Math.ceil(items.length / capacity));
  const currentPage = Math.min(page, pages - 1);
  const visibleItems = items.slice(
    currentPage * capacity,
    (currentPage + 1) * capacity,
  );
  const key = `kuizfit:items:v1:${user}`;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refreshDay() {
      clearTimeout(timer);
      if (!user) return;
      try {
        const stored = localStorage.getItem(key);
        const snapshot = readChecklist(stored);
        const next = snapshot.needsExamples
          ? addChecklistExamples(snapshot.items)
          : snapshot.items;
        if (snapshot.needsExamples || snapshot.needsReset) {
          localStorage.setItem(
            key,
            JSON.stringify({
              day: checklistDay(),
              items: next,
              examplesInitialized: true,
            }),
          );
        }
        setItems(next);
        setReady(Boolean(user));
        setError("");
      } catch {
        setError("无法保存或读取清单，请检查浏览器存储权限。");
      }
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      timer = setTimeout(
        refreshDay,
        Math.max(1, midnight.getTime() - Date.now()),
      );
    }
    function visible() {
      if (document.visibilityState === "visible") refreshDay();
    }
    function changed(event: StorageEvent) {
      if (event.key === key) refreshDay();
    }
    refreshDay();
    window.addEventListener("focus", refreshDay);
    window.addEventListener("storage", changed);
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refreshDay);
      window.removeEventListener("storage", changed);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [key, user]);
  function save(next: ChecklistItem[]) {
    const ordered = orderItems(next);
    try {
      // Synchronous, atomic storage: failed writes leave both the previous list
      // and the input intact; no asynchronous response can overwrite newer edits.
      localStorage.setItem(
        key,
        JSON.stringify({
          day: checklistDay(),
          items: ordered,
          examplesInitialized: true,
        }),
      );
      itemsRef.current = ordered;
      setItems(ordered);
      setError("");
      return true;
    } catch {
      setError("保存失败，未更改清单。");
      return false;
    }
  }
  function commitDraft() {
    if (!ready || !text.trim() || items.length >= ITEM_LIMIT) return;
    const next = appendChecklistItem(
      itemsRef.current,
      text,
      crypto.randomUUID(),
    );
    if (save(next)) {
      setText("");
      setPage(Math.floor((next.length - 1) / capacity));
    }
  }
  return (
    <div ref={root} className={styles.checklist}>
      {controls && <div className={styles.header}>{controls}</div>}
      <div className={styles.listFrame}>
        <ChecklistRows
          items={visibleItems}
          allDone={items.length > 0 && items.every((item) => item.completed)}
          spare={
            active && items.length < ITEM_LIMIT && currentPage === pages - 1
          }
          onToggle={(id, on) => save(toggleItem(itemsRef.current, id, on))}
          onDelete={(id) =>
            save(itemsRef.current.filter((item) => item.id !== id))
          }
        />
        {active && items.length < ITEM_LIMIT && currentPage === pages - 1 && (
          <div className={`${styles.row} ${styles.draftRow}`}>
            <Checkbox.Root
              className={styles.checkbox}
              checked={false}
              disabled
              aria-label="空白物品不参与勾选"
            />
            <input
              className={styles.draftName}
              aria-label="物品名称"
              placeholder="物品"
              maxLength={32}
              value={text}
              disabled={!ready}
              onChange={(event) => setText(event.target.value)}
              onBlur={() => commitDraft()}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  commitDraft();
                }
                if (event.key === "Escape") setText("");
              }}
            />
          </div>
        )}
        {pages > 1 && (
          <div className={styles.pagination} aria-label="物品清单分页">
            <Button
              aria-label="上一页物品"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              ‹
            </Button>
            <span>
              {currentPage + 1} / {pages}
            </span>
            <Button
              aria-label="下一页物品"
              disabled={currentPage === pages - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              ›
            </Button>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
