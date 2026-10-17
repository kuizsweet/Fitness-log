"use client";
import {
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import { Check, GripVertical, Plus, X } from "lucide-react";
import { TabsContent } from "../ui/tabs";
import { Button } from "../ui/button";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "../ui/sortable";
import { useResourceUser } from "../ResourceProvider";
import {
  ITEM_LIMIT,
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
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const before = useRef(new Map<string, DOMRect>());
  const motions = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    const positions = before.current;
    before.current = new Map();
    if (
      !positions.size ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    root.current
      ?.querySelectorAll<HTMLElement>("[data-checklist-id]")
      .forEach((node) => {
        const old = positions.get(node.dataset.checklistId!);
        const next = node.getBoundingClientRect();
        if (old && old.y !== next.y)
          motions.current.push(
            node.animate(
              [
                { transform: `translateY(${old.y - next.y}px)` },
                { transform: "translateY(0)" },
              ],
              { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
            ),
          );
      });
  }, [items]);
  useEffect(
    () => () => motions.current.forEach((animation) => animation.cancel()),
    [],
  );
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
        44;
      const full = Math.max(1, Math.min(10, Math.floor((available + 2) / 24)));
      setCapacity(
        items.length > full
          ? Math.max(1, Math.floor((available - 26) / 24))
          : full,
      );
    }
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    measure();
    return () => observer.disconnect();
  }, [items.length, active]);
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
      setItems(ordered);
      setError("");
      return true;
    } catch {
      setError("保存失败，未更改清单。");
      return false;
    }
  }
  return (
    <div ref={root} className={styles.checklist}>
      <div className={styles.header}>
        <form
          className={styles.add}
          style={{ visibility: active ? "visible" : "hidden" }}
          aria-hidden={!active}
          inert={!active}
          onSubmit={(event) => {
            event.preventDefault();
            if (!ready || !text.trim() || items.length >= ITEM_LIMIT) return;
            if (
              save([
                ...items,
                {
                  id: crypto.randomUUID(),
                  text: text.trim(),
                  completed: false,
                  order: items.length,
                },
              ])
            )
              setText("");
          }}
        >
          <input
            aria-label="新增物品"
            placeholder={items.length >= ITEM_LIMIT ? "最多 10 项" : "添加物品"}
            maxLength={32}
            value={text}
            disabled={!ready || items.length >= ITEM_LIMIT}
            onChange={(event) => setText(event.target.value)}
          />
          <Button
            type="submit"
            className={styles.addButton}
            aria-label="添加物品"
            disabled={!ready || !text.trim() || items.length >= ITEM_LIMIT}
          >
            <Plus aria-hidden />
          </Button>
        </form>
        {controls}
      </div>
      <TabsContent value="items">
        <Sortable
          value={visibleItems}
          onValueChange={(next) =>
            save([
              ...items.slice(0, currentPage * capacity),
              ...next,
              ...items.slice((currentPage + 1) * capacity),
            ])
          }
          getItemValue={(item) => item.id}
          orientation="vertical"
          autoScroll={false}
        >
          <SortableContent
            className={styles.list}
            role="list"
            aria-label="物品清单"
          >
            {visibleItems.map((item) => (
              <SortableItem
                key={item.id}
                value={item.id}
                className={styles.row}
                role="listitem"
                data-checklist-id={item.id}
              >
                <SortableItemHandle
                  className={styles.handle}
                  aria-label={`拖动排序：${item.text}`}
                >
                  <GripVertical aria-hidden />
                </SortableItemHandle>
                <Checkbox.Root
                  className={styles.checkbox}
                  checked={item.completed}
                  onCheckedChange={(completed) => {
                    before.current = new Map();
                    root.current
                      ?.querySelectorAll<HTMLElement>("[data-checklist-id]")
                      .forEach((node) =>
                        before.current.set(
                          node.dataset.checklistId!,
                          node.getBoundingClientRect(),
                        ),
                      );
                    motions.current.forEach((animation) => animation.cancel());
                    motions.current = [];
                    if (!save(toggleItem(items, item.id, completed)))
                      before.current.clear();
                  }}
                  aria-label={`已准备：${item.text}`}
                >
                  <Checkbox.Indicator>
                    <Check aria-hidden />
                  </Checkbox.Indicator>
                </Checkbox.Root>
                <span
                  className={styles.name}
                  data-completed={item.completed || undefined}
                  title={item.text}
                >
                  {item.text}
                </span>
                <Button
                  className={styles.remove}
                  aria-label={`删除：${item.text}`}
                  onClick={() =>
                    save(items.filter((value) => value.id !== item.id))
                  }
                >
                  <X aria-hidden />
                </Button>
              </SortableItem>
            ))}
          </SortableContent>
          <SortableOverlay>
            {({ value }) => {
              const item = items.find((item) => item.id === value);
              return item ? (
                <div className={`${styles.row} ${styles.overlay}`}>
                  <GripVertical aria-hidden />
                  <span className={styles.previewCheck}>
                    {item.completed ? <Check aria-hidden /> : null}
                  </span>
                  <span
                    className={styles.name}
                    data-completed={item.completed || undefined}
                  >
                    {item.text}
                  </span>
                </div>
              ) : null;
            }}
          </SortableOverlay>
        </Sortable>
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
      </TabsContent>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
