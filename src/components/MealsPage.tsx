"use client";
import { useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Sunrise,
  Sun,
  Sunset,
  Coffee,
} from "lucide-react";
import { useResource } from "./resource";
import { useResourceUser } from "./ResourceProvider";
import { api } from "@/lib/client";
import { today, type Meal, type MealPhoto, type Profile } from "@/lib/domain";
import { PhotoFlipCard } from "./meals/PhotoFlipCard";
import styles from "./MealsPage.module.css";

const mealTypes = [
  ["breakfast", "早餐", Sunrise],
  ["lunch", "午餐", Sun],
  ["dinner", "晚餐", Sunset],
  ["snack", "加餐", Coffee],
] as const;
type GalleryPhoto = MealPhoto & {
  meal: Pick<Meal, "id" | "meal_date" | "meal_type" | "notes" | "calories">;
};
type GalleryPage = { photos: GalleryPhoto[]; nextOffset: number | null };
type Capabilities = { photoNotes: boolean; extendedMeals: boolean };
const mealLabel = (type: Meal["meal_type"]) =>
  mealTypes.find(([key]) => key === type)?.[1] ?? "饮食";
export function MealsPage({ initialDate }: { initialDate?: string }) {
  const user = useResourceUser();
  return <MealsWorkspace key={user} user={user} initialDate={initialDate} />;
}
function MealsWorkspace({
  user,
  initialDate,
}: {
  user: string;
  initialDate?: string;
}) {
  const profile = useResource<Profile>("profile");
  const capabilities = useResource<Capabilities>("meal-capabilities");
  const currentDay = today(profile.data?.timezone);
  const [picked, setPicked] = useState(initialDate ?? "");
  const date = picked || currentDay;
  const [filter, setFilter] = useState<"all" | "date" | "random">("all");
  const [recordHidden, setRecordHidden] = useState(false);
  const recordToggle = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(0);
  const [review, setReview] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const meals = useResource<Meal[]>(`meals?date=${date}`, true);
  const history = useInfiniteQuery({
    queryKey: [user, "meal-gallery", filter === "date" ? date : "all"],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api<GalleryPage>(
        `meal-history?offset=${pageParam}${filter === "date" ? `&date=${date}` : ""}`,
        undefined,
        "GET",
        { signal },
      ),
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    enabled: Boolean(user),
    staleTime: 60_000,
  });
  const photos = useMemo(
    () => history.data?.pages.flatMap((page) => page.photos) ?? [],
    [history.data],
  );
  const displayed = useMemo(
    () =>
      filter === "random"
        ? [...photos].sort(
            (a, b) => review.indexOf(a.id) - review.indexOf(b.id),
          )
        : photos,
    [photos, filter, review],
  );
  function changed() {
    meals.reload();
    void queryClient.invalidateQueries({ queryKey: [user, "meal-gallery"] });
  }

  return (
    <div className={styles.page} data-record-hidden={recordHidden || undefined}>
      <section className={styles.history} aria-label="历史饮食">
        <header className={styles.historyHeading}>
          <h1>历史饮食</h1>
          <div className={styles.filters} aria-label="饮食历史筛选">
            <button
              aria-pressed={filter === "all"}
              onClick={() => {
                setFilter("all");
                setPage(0);
              }}
            >
              全部
            </button>
            <button
              aria-pressed={filter === "date"}
              onClick={() => {
                setFilter("date");
                setPage(0);
              }}
            >
              按日期
            </button>
            <button
              aria-pressed={filter === "random"}
              disabled={!photos.length}
              onClick={() => {
                setReview(
                  photos
                    .map((photo) => ({ id: photo.id, random: Math.random() }))
                    .sort((a, b) => a.random - b.random)
                    .map((photo) => photo.id),
                );
                setFilter("random");
                setPage(0);
              }}
            >
              随机回顾
            </button>
          </div>
          {filter === "date" && (
            <input
              type="date"
              aria-label="历史饮食日期"
              value={date}
              min="2020-01-01"
              max="2030-12-31"
              onChange={(event) => {
                if (event.target.value) {
                  setPicked(event.target.value);
                  setPage(0);
                }
              }}
            />
          )}
        </header>
        {history.error && (
          <p role="alert">
            {history.error.message}
            <button onClick={() => void history.refetch()}>重试</button>
          </p>
        )}
        {history.isPending && <p className={styles.empty}>正在读取饮食照片…</p>}
        {!history.isPending && !history.error && !photos.length && (
          <div className={styles.empty}>
            <ImagePlus size={32} />
            <h2>还没有饮食照片</h2>
            <p>在右侧记录一餐，照片会留在这里。</p>
          </div>
        )}
        <div className={styles.gallery}>
          {displayed.slice(page * 2, page * 2 + 2).map((photo) => (
            <PhotoFlipCard
              key={photo.id}
              photo={photo}
              label={`${photo.meal.meal_date} · ${mealLabel(photo.meal.meal_type)}`}
              canSave={Boolean(capabilities.data?.photoNotes)}
              onChanged={changed}
              onReplace={async (file) => {
                if (file.size > 3 * 1024 * 1024) throw Error("照片需小于 3 MB");
                const form = new FormData();
                form.append("meal_id", photo.meal.id);
                form.append("file", file);
                await api("photos", form);
                await api("photos", { id: photo.id, restore: false }, "PATCH");
                changed();
              }}
            />
          ))}
        </div>
        {!!photos.length && (
          <nav className={styles.pagination} aria-label="饮食照片翻页">
            <button
              disabled={page === 0}
              aria-label="上一页"
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>第 {page + 1} 页</span>
            <button
              disabled={
                history.isFetchingNextPage ||
                (page * 2 + 2 >= displayed.length && !history.hasNextPage)
              }
              aria-label="下一页"
              onClick={async () => {
                if (page * 2 + 2 >= displayed.length) {
                  const result = await history.fetchNextPage();
                  if (
                    (result.data?.pages.flatMap((item) => item.photos).length ??
                      0) <=
                    page * 2 + 2
                  )
                    return;
                }
                setPage(page + 1);
              }}
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        )}
      </section>
      <div className={styles.recordPanel}>
        <button
          ref={recordToggle}
          className={styles.recordToggle}
          aria-label={recordHidden ? "展开饮食记录" : "收起饮食记录"}
          aria-expanded={!recordHidden}
          aria-controls="meal-record-panel"
          onClick={() => setRecordHidden((hidden) => !hidden)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="3"
              width="18"
              height="18"
              rx="1"
              stroke="currentColor"
              strokeWidth="2"
            />
            {recordHidden ? (
              <>
                <path d="M9 4H20V20H9Z" fill="currentColor" />
                <path d="M16 7L11 12L16 17Z" fill="var(--surface)" />
              </>
            ) : (
              <>
                <path d="M15 3V21" stroke="currentColor" strokeWidth="2" />
                <path d="M7 7L12 12L7 17Z" fill="currentColor" />
              </>
            )}
          </svg>
        </button>
        <aside
          id="meal-record-panel"
          className={styles.today}
          aria-label="当天饮食记录"
          inert={recordHidden}
          aria-hidden={recordHidden}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setRecordHidden(true);
              recordToggle.current?.focus();
            }
          }}
        >
          <header className={styles.todayHeading}>
            <div>
              <h2>{date === currentDay ? "今天" : "饮食记录"}</h2>
              <label className={styles.dateLabel}>
                {new Intl.DateTimeFormat("zh-CN", {
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                  timeZone: "UTC",
                }).format(new Date(`${date}T00:00:00Z`))}
                <input
                  type="date"
                  aria-label="三餐日期"
                  value={date}
                  min="2020-01-01"
                  max="2030-12-31"
                  onChange={(event) => {
                    if (event.target.value) {
                      setPicked(event.target.value);
                      setPage(0);
                    }
                  }}
                />
              </label>
            </div>
            {date !== currentDay && (
              <button onClick={() => setPicked(currentDay)}>今天</button>
            )}
          </header>
          {capabilities.data && !capabilities.data.photoNotes && (
            <p className={styles.pending}>
              照片独立备注、加餐和热量保存尚未启用。
            </p>
          )}
          {(meals.error || capabilities.error) && (
            <p role="alert">{meals.error || capabilities.error}</p>
          )}
          {mealTypes.map(([type, label, Icon]) => (
            <MealSlot
              key={`${date}:${type}`}
              date={date}
              type={type}
              label={label}
              Icon={Icon}
              meal={meals.data?.find((meal) => meal.meal_type === type)}
              disabled={
                meals.loading ||
                Boolean(meals.error) ||
                (type === "snack" && !capabilities.data?.extendedMeals)
              }
              onView={() => {
                setFilter("date");
                setPage(0);
              }}
              onChanged={changed}
            />
          ))}
        </aside>
      </div>
    </div>
  );
}
function MealSlot({
  date,
  type,
  label,
  Icon,
  meal,
  disabled,
  onView,
  onChanged,
}: {
  date: string;
  type: Meal["meal_type"];
  label: string;
  Icon: typeof Sun;
  meal?: Meal;
  disabled: boolean;
  onView: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function upload(files: File[], replace?: MealPhoto) {
    if (!files.length || disabled || busy) return;
    setBusy(true);
    setError("");
    let done = 0;
    try {
      const parent =
        meal ??
        (await api<Meal>("meals", {
          meal_date: date,
          meal_type: type,
          notes: "",
        }));
      for (const file of files) {
        if (file.size > 3 * 1024 * 1024) throw Error("照片需小于 3 MB");
        setProgress(`正在上传 ${done + 1}/${files.length}`);
        const form = new FormData();
        form.append("meal_id", parent.id);
        form.append("file", file);
        await api("photos", form);
        done++;
      }
      if (replace)
        await api("photos", { id: replace.id, restore: false }, "PATCH");
    } catch (cause) {
      setError(
        `${(cause as Error).message}${done ? `；已有 ${done} 张保存` : ""}`,
      );
    } finally {
      setBusy(false);
      setProgress("");
      onChanged();
    }
  }
  return (
    <section className={styles.mealSlot} aria-label={label}>
      <header>
        <h3>{label}</h3>
        <Icon size={19} strokeWidth={1.5} />
      </header>
      <input
        ref={input}
        className={styles.hiddenInput}
        type="file"
        aria-label={`添加${label}照片`}
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        disabled={busy || disabled}
        onChange={(event) => {
          void upload(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <button
        className={styles.upload}
        disabled={busy || disabled}
        onClick={() => input.current?.click()}
      >
        <ImagePlus size={20} />
        <span>
          {busy
            ? progress || "正在保存…"
            : disabled && type === "snack"
              ? "加餐待启用"
              : "添加照片"}
        </span>
      </button>
      {!!meal?.photos.some((photo) => !photo.deleted_at) && (
        <button className={styles.viewPhotos} onClick={onView}>
          查看已上传的 {meal.photos.filter((photo) => !photo.deleted_at).length}{" "}
          张照片
        </button>
      )}
      {meal?.notes && (
        <details className={styles.legacyNotes}>
          <summary>这餐原有备注</summary>
          <p>{meal.notes}</p>
        </details>
      )}
      {error && <p role="alert">{error}</p>}
      {meal?.photos.some((photo) => photo.deleted_at) && (
        <details className={styles.legacyNotes}>
          <summary>已删除照片</summary>
          {meal.photos
            .filter((photo) => photo.deleted_at)
            .map((photo) => (
              <button
                key={photo.id}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(
                      "photos",
                      { id: photo.id, restore: true },
                      "PATCH",
                    );
                    onChanged();
                  } catch (cause) {
                    setError((cause as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                恢复 {photo.original_name}
              </button>
            ))}
        </details>
      )}
    </section>
  );
}
