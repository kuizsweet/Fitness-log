"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import type { Meal, MealPhoto } from "@/lib/domain";
import { Feedback } from "./Feedback";
const mealNames = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐" };
export function Meals({
  date,
  meals,
  reload,
}: {
  date: string;
  meals: Meal[];
  reload: () => void;
}) {
  return (
    <>
      {(["breakfast", "lunch", "dinner"] as const).map((type) => (
        <MealEditor
          key={type}
          date={date}
          type={type}
          meal={meals.find((m) => m.meal_type === type)}
          reload={reload}
        />
      ))}
    </>
  );
}
function MealEditor({
  date,
  type,
  meal,
  reload,
}: {
  date: string;
  type: Meal["meal_type"];
  meal?: Meal;
  reload: () => void;
}) {
  const [notes, setNotes] = useState(meal?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string[]>([]);
  async function ensureMeal() {
    return api<Meal>("meals", { meal_date: date, meal_type: type, notes });
  }
  async function upload(files: FileList | null, replace?: MealPhoto) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    const urls = Array.from(files)
      .filter((f) => !/\.hei[cf]$/i.test(f.name))
      .map((f) => URL.createObjectURL(f));
    setPreview(urls);
    let uploaded = 0;
    try {
      const m = await ensureMeal();
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("meal_id", m.id);
        form.append("file", file);
        await api("photos", form);
        uploaded++;
      }
      if (replace)
        await api("photos", { id: replace.id, restore: false }, "PATCH");
      setMessage(`${uploaded} 张照片已保存`);
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "上传失败"}${uploaded ? `；此前 ${uploaded} 张已保存` : ""}`,
      );
    } finally {
      urls.forEach((u) => URL.revokeObjectURL(u));
      setPreview([]);
      setBusy(false);
      reload();
    }
  }
  async function changePhoto(p: MealPhoto) {
    if (!p.deleted_at && !confirm("删除这张照片？删除后可在此恢复。")) return;
    setBusy(true);
    setError("");
    try {
      await api("photos", { id: p.id, restore: !p.deleted_at }, "PATCH");
      setMessage(p.deleted_at ? "照片已恢复" : "照片已删除，可以恢复");
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="entry">
      <h3>{mealNames[type]}</h3>
      <label>
        备注
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="row">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await ensureMeal();
              setMessage("备注已保存");
              reload();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          保存备注
        </button>
        <label>
          相册上传（每张 ≤ 3 MB）
          <input
            disabled={busy}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            multiple
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label>
          拍照
          <input
            disabled={busy}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <small>
        JPEG / PNG / WebP；HEIC 若服务器不能转换，会提示改用
        JPEG。保存时压缩并去除定位等元数据。
      </small>
      <div className="photos">
        {(meal?.photos ?? [])
          .filter((p) => !p.deleted_at)
          .map((p) => (
            <figure key={p.id}>
              {/* Signed URLs are temporary, not public assets. */}
              <img src={p.url} alt={`${mealNames[type]}照片`} loading="lazy" />
              <figcaption>
                <button disabled={busy} onClick={() => void changePhoto(p)}>
                  删除
                </button>
                <label>
                  替换
                  <input
                    disabled={busy}
                    type="file"
                    accept="image/*,.heic,.heif"
                    onChange={(e) => {
                      void upload(e.target.files, p);
                      e.target.value = "";
                    }}
                  />
                </label>
              </figcaption>
            </figure>
          ))}
        {preview.map((url) => (
          <figure key={url}>
            <img src={url} alt="正在上传的预览" />
          </figure>
        ))}
      </div>
      {meal?.photos.some((p) => p.deleted_at) && (
        <details>
          <summary>已删除照片</summary>
          {meal.photos
            .filter((p) => p.deleted_at)
            .map((p) => (
              <p key={p.id}>
                {p.original_name}{" "}
                <button disabled={busy} onClick={() => void changePhoto(p)}>
                  恢复
                </button>
              </p>
            ))}
        </details>
      )}
      <Feedback error={error} message={message} loading={busy} />
    </section>
  );
}
