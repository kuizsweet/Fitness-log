"use client";
import { useState } from "react";
import { useResource } from "./resource";
import { Feedback } from "./Feedback";
import { api } from "@/lib/client";
import {
  equipmentTypes,
  equipmentNames,
  modes,
  modeNames,
  type Equipment,
  type Exercise,
} from "@/lib/domain";
import { exercisePresets, equipmentPresets } from "@/lib/presets";
export function Catalog() {
  const catalog = useResource<{
    exercises: Exercise[];
    equipment: Equipment[];
  }>("catalog");
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(
    kind: "exercises" | "equipment",
    item: Exercise | Equipment,
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("catalog", { kind, item });
      setMessage("配置已保存");
      setExercise(null);
      setEquipment(null);
      catalog.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>动作与器材</h1>
      <p>动作和器材分别管理。预设需主动添加，不会生成训练历史。</p>
      <Feedback
        error={catalog.error || error}
        loading={catalog.loading || busy}
        message={message}
      />
      <h2>动作</h2>
      <div className="row">
        <button
          onClick={() =>
            setExercise({
              id: crypto.randomUUID(),
              name: "",
              muscle_group: "",
              notes: "",
              hidden: false,
            })
          }
        >
          自定义动作
        </button>
        <label>
          从预设添加
          <select
            value=""
            onChange={(e) => {
              const preset = exercisePresets[Number(e.target.value)];
              setExercise({
                ...preset,
                id: crypto.randomUUID(),
                notes: "",
                hidden: false,
              });
            }}
          >
            <option value="">请选择</option>
            {exercisePresets.map((e, i) => (
              <option key={e.name} value={i}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {exercise && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save("exercises", exercise);
          }}
        >
          <label>
            名称
            <input
              required
              maxLength={120}
              value={exercise.name}
              onChange={(e) =>
                setExercise({ ...exercise, name: e.target.value })
              }
            />
          </label>
          <label>
            肌群
            <input
              value={exercise.muscle_group}
              onChange={(e) =>
                setExercise({ ...exercise, muscle_group: e.target.value })
              }
            />
          </label>
          <label>
            备注
            <textarea
              value={exercise.notes}
              onChange={(e) =>
                setExercise({ ...exercise, notes: e.target.value })
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={exercise.hidden}
              onChange={(e) =>
                setExercise({ ...exercise, hidden: e.target.checked })
              }
            />
            隐藏
          </label>
          <div className="row">
            <button disabled={busy} className="primary">
              保存动作
            </button>
            <button type="button" onClick={() => setExercise(null)}>
              取消
            </button>
          </div>
        </form>
      )}
      {catalog.data?.exercises.map((item) => (
        <div className="entry" key={item.id}>
          <p>
            {item.name} · {item.muscle_group || "未指定肌群"}{" "}
            {item.hidden && "· 已隐藏"} {item.deleted_at && "· 已删除"}
          </p>
          <div className="row">
            <button
              disabled={busy || Boolean(item.deleted_at)}
              onClick={() => setExercise(item)}
            >
              编辑
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  item.deleted_at ||
                  confirm("删除此动作配置？历史训练仍保留，可以恢复。")
                )
                  void save("exercises", {
                    ...item,
                    deleted_at: item.deleted_at
                      ? null
                      : new Date().toISOString(),
                  });
              }}
            >
              {item.deleted_at ? "恢复" : "删除"}
            </button>
          </div>
        </div>
      ))}
      <h2>器材</h2>
      <label>
        添加器材（选择基础类型）
        <select
          value=""
          onChange={(e) =>
            setEquipment({
              ...equipmentPresets[Number(e.target.value)],
              id: crypto.randomUUID(),
            })
          }
        >
          <option value="">请选择</option>
          {equipmentPresets.map((e, i) => (
            <option value={i} key={e.type}>
              {equipmentNames[e.type]}
            </option>
          ))}
        </select>
      </label>
      {equipment && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const values = String(
              new FormData(e.currentTarget).get("increments") ?? "",
            )
              .split(/[,，]/)
              .filter((s) => s.trim())
              .map(Number);
            if (values.some((n) => !Number.isFinite(n) || n < 0)) {
              setError("档位必须为非负数，器材尚未保存");
              return;
            }
            void save("equipment", { ...equipment, increments: values });
          }}
        >
          <fieldset disabled={busy}>
            <legend>器材配置</legend>
            <label>
              名称
              <input
                required
                maxLength={120}
                value={equipment.name}
                onChange={(e) =>
                  setEquipment({ ...equipment, name: e.target.value })
                }
              />
            </label>
            <div className="row">
              <label>
                类型
                <select
                  value={equipment.type}
                  onChange={(e) =>
                    setEquipment({
                      ...equipment,
                      type: e.target.value as Equipment["type"],
                    })
                  }
                >
                  {equipmentTypes.map((t) => (
                    <option value={t} key={t}>
                      {equipmentNames[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                默认单位
                <select
                  value={equipment.unit}
                  onChange={(e) =>
                    setEquipment({
                      ...equipment,
                      unit: e.target.value as Equipment["unit"],
                    })
                  }
                >
                  <option>kg</option>
                  <option>lb</option>
                </select>
              </label>
              <label>
                默认计量规则
                <select
                  value={equipment.rule}
                  onChange={(e) =>
                    setEquipment({
                      ...equipment,
                      rule: e.target.value as Equipment["rule"],
                    })
                  }
                >
                  {modes.map((m) => (
                    <option value={m} key={m}>
                      {modeNames[m]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              杆重 / 器械初始质量（未知留空）
              <input
                type="number"
                min="0"
                step="0.25"
                inputMode="decimal"
                value={equipment.initial_weight ?? ""}
                onChange={(e) =>
                  setEquipment({
                    ...equipment,
                    initial_weight:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              不规则配重档位（用逗号分隔）
              <input
                defaultValue={equipment.increments.join(",")}
                name="increments"
                key={equipment.id}
              />
            </label>
            <label>
              备注
              <textarea
                value={equipment.notes}
                onChange={(e) =>
                  setEquipment({ ...equipment, notes: e.target.value })
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={equipment.hidden}
                onChange={(e) =>
                  setEquipment({ ...equipment, hidden: e.target.checked })
                }
              />
              隐藏
            </label>
            <div className="row">
              <button className="primary">保存器材</button>
              <button type="button" onClick={() => setEquipment(null)}>
                取消
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {catalog.data?.equipment.map((item) => (
        <div className="entry" key={item.id}>
          <p>
            {item.name} · {equipmentNames[item.type]} · {modeNames[item.rule]}{" "}
            {item.hidden && "· 已隐藏"} {item.deleted_at && "· 已删除"}
          </p>
          <div className="row">
            <button
              disabled={busy || Boolean(item.deleted_at)}
              onClick={() => setEquipment(item)}
            >
              编辑
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void save("equipment", { ...item, hidden: !item.hidden })
              }
            >
              {item.hidden ? "显示" : "隐藏"}
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  item.deleted_at ||
                  confirm("删除此器材配置？历史训练快照保留，可以恢复。")
                )
                  void save("equipment", {
                    ...item,
                    deleted_at: item.deleted_at
                      ? null
                      : new Date().toISOString(),
                  });
              }}
            >
              {item.deleted_at ? "恢复" : "删除"}
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
