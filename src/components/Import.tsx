"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { useResource } from "./resource";
import {
  fields,
  mapSheet,
  importRowSchema,
  type Workbook,
  type Candidate,
  type ImportRow,
} from "@/lib/import/parser";
import type { Batch } from "@/lib/domain";
import { ImportMapping, type SheetConfig } from "./ImportMapping";
import { ImportPreview } from "./ImportPreview";
import { Feedback } from "./Feedback";
type Preview = { id: string; filename: string; workbook: Workbook };
export function Import() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [configs, setConfigs] = useState<SheetConfig[]>([]);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const batches = useResource<Batch[]>("imports");
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    setPreview(null);
    setRows([]);
    try {
      const form = new FormData();
      form.append("file", file);
      const p = await api<Preview>("imports/preview", form);
      setPreview(p);
      setConfigs(
        p.workbook.sheets.map((s) => ({
          mapping: s.mapping,
          header: s.header,
          mode: "unknown",
          kind: "unknown",
        })),
      );
      setAck(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function buildPreview() {
    if (!preview) return;
    setError("");
    const invalid = configs.find((c) => {
      const values = fields
        .map((f) => c.mapping[f])
        .filter((v) => v !== undefined);
      return new Set(values).size !== values.length;
    });
    if (invalid) {
      setError(
        "一个源列不能同时映射到多个字段。计划/实际可通过本表默认类型或逐行确认。",
      );
      return;
    }
    const mapped = preview.workbook.sheets.flatMap((s, i) =>
      mapSheet(
        s,
        configs[i].mapping,
        configs[i].header,
        configs[i].mode,
        configs[i].kind,
      ),
    );
    setRows(mapped);
    if (!mapped.length)
      setError("没有识别到数据行，请核对表头行号与字段映射。");
  }
  function change(index: number, row: Candidate) {
    const candidate = {
      ...row,
      needs_weight_review:
        rows[index].needs_weight_review && row.weight === rows[index].weight,
    };
    const parsed = importRowSchema.safeParse(candidate);
    setRows((all) =>
      all.map((r, i) =>
        i === index
          ? {
              ...candidate,
              errors: [
                ...(parsed.success
                  ? []
                  : parsed.error.issues.map(
                      (e) => `${e.path.join(".")}: ${e.message}`,
                    )),
                ...(candidate.needs_weight_review
                  ? ["重量原文仍无法识别，请输入确认后的数值或排除此行"]
                  : []),
              ],
            }
          : r,
      ),
    );
  }
  async function commit() {
    setError("");
    const included = rows.filter((r) => r.include);
    const clean: ImportRow[] = [];
    for (const row of included) {
      const parsed = importRowSchema.safeParse(row);
      if (!parsed.success || row.errors.length) {
        setError(`${row.source} 仍有待确认内容，请修正或排除此行。`);
        return;
      }
      clean.push(parsed.data);
    }
    if (!clean.length) {
      setError("请选择至少一行");
      return;
    }
    if (!confirm(`确认导入 ${clean.length} 行？只导入预览中的有效记录。`))
      return;
    setBusy(true);
    try {
      const result = await api<{
        rows: number;
        sessions: number;
        excluded: number;
        unimported_images: number;
      }>("imports", {
        preview_id: preview!.id,
        rows: clean,
        acknowledged_images: ack,
        excluded: rows.filter((r) => !r.include).map((r) => r.source),
      });
      setMessage(
        `已导入 ${result.rows} 行、${result.sessions} 次训练；排除 ${result.excluded} 行，${result.unimported_images} 张嵌入图片未导入。`,
      );
      setPreview(null);
      setRows([]);
      batches.reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <h1>Excel 导入</h1>
      <p>先解析、映射、核对，再确认保存。原文件不会被修改。</p>
      <label>
        .xlsx 文件（≤ 3 MB）
        <input
          disabled={busy}
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <Feedback
        error={error || batches.error}
        message={message}
        loading={busy}
      />
      {preview && (
        <>
          <h2>{preview.filename}</h2>
          {preview.workbook.warnings.map((w) => (
            <p className="notice" key={w}>
              {w}
            </p>
          ))}
          {preview.workbook.sheets.map((s, i) => (
            <ImportMapping
              key={s.name}
              sheet={s}
              config={configs[i]}
              change={(c) => {
                setConfigs((all) => all.map((old, j) => (j === i ? c : old)));
                setRows([]);
              }}
            />
          ))}
          <button disabled={busy} onClick={buildPreview}>
            生成导入预览
          </button>
          {preview.workbook.images.length > 0 && (
            <>
              <h2>未导入图片 · {preview.workbook.images.length} 张</h2>
              {preview.workbook.images.map((img, i) => (
                <p key={i}>
                  {img.sheet} · {img.anchor}：{img.reason}
                </p>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />
                确认这些图片未导入，将按日期手动上传
              </label>
            </>
          )}
          <h2>待导入预览</h2>
          {rows.length > 0 && (
            <>
              <p>
                {rows.filter((r) => r.include).length}{" "}
                行已选择。日期、重量含义、计划/实际等歧义需人工确认。器材名称作为原文保留，不推断器材类型。
              </p>
              <ImportPreview rows={rows} change={change} />
              <button
                className="primary"
                disabled={busy || (preview.workbook.images.length > 0 && !ack)}
                onClick={() => void commit()}
              >
                确认并保存到数据库
              </button>
            </>
          )}
        </>
      )}
      <h2>导入批次（最近 100 次）</h2>
      {!batches.loading && !batches.error && !batches.data?.length && (
        <p>尚无导入记录。</p>
      )}
      {batches.data?.map((b) => (
        <article className="entry" key={b.id}>
          <p>
            {b.filename} · {b.row_count} 行 · {b.created_at}
            {b.undone_at && " · 已撤销"}
          </p>
          <details>
            <summary>导入报告</summary>
            <pre className="scroll">{JSON.stringify(b.report, null, 2)}</pre>
          </details>
          <button
            disabled={busy || Boolean(b.undone_at)}
            onClick={async () => {
              if (!confirm("撤销此批次？导入后手动修改的训练会保留。")) return;
              setBusy(true);
              setError("");
              try {
                const r = await api<{ removed: number; kept: number }>(
                  "imports",
                  { id: b.id },
                  "PATCH",
                );
                setMessage(
                  `已撤销 ${r.removed} 次训练，保留 ${r.kept} 次已修改训练。可在对应日期控制台的已删除记录中恢复。`,
                );
                batches.reload();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            撤销批次
          </button>
        </article>
      ))}
    </>
  );
}
