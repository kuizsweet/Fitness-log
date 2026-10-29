import {
  emptyWorkbench,
  readWorkbench,
  persistedWorkbench,
  type WorkbenchState,
} from "./training-workbench";

// PostgreSQL jsonb does not retain object key order.
export function stableWorkbench(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableWorkbench).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => `${JSON.stringify(key)}:${stableWorkbench(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
const equal = (a: unknown, b: unknown) =>
  stableWorkbench(a) === stableWorkbench(b);

/** Merge independent edits, additions and deletions without replacing an entire device. */
export function mergeWorkbenches(
  base: WorkbenchState,
  local: WorkbenchState,
  remote: WorkbenchState,
): WorkbenchState {
  const previous = new Map(base.notes.map((n) => [n.id, n]));
  const here = new Map(local.notes.map((n) => [n.id, n]));
  const there = new Map(remote.notes.map((n) => [n.id, n]));
  const notes: WorkbenchState["notes"] = [];
  for (const id of new Set([
    ...here.keys(),
    ...there.keys(),
    ...previous.keys(),
  ])) {
    const b = previous.get(id),
      l = here.get(id),
      r = there.get(id);
    if (!equal(l, b) && !equal(r, b) && !equal(l, r))
      throw Error("两处修改了同一张便签，已保留本地和云端数据，暂未互相覆盖。");
    const chosen = !equal(l, b) ? l : r;
    if (chosen) notes.push(chosen);
  }
  if (notes.length > 30)
    throw Error("合并后超过30张便签，已保留两边数据，暂未覆盖。");
  const ids = new Set(notes.map((n) => n.id));
  const assignments: WorkbenchState["assignments"] = {};
  for (const day of new Set([
    ...Object.keys(base.assignments),
    ...Object.keys(local.assignments),
    ...Object.keys(remote.assignments),
  ])) {
    const b = base.assignments[day] ?? [],
      l = local.assignments[day] ?? [],
      r = remote.assignments[day] ?? [];
    const values = [...new Set([...l, ...r])].filter(
      (id) =>
        ids.has(id) &&
        (l.includes(id) === b.includes(id) ? r.includes(id) : l.includes(id)),
    );
    if (values.length) assignments[day] = values;
  }
  return { notes, assignments };
}

export type WorkbenchSnapshot = { state: WorkbenchState; revision: number };
type Store = Pick<Storage, "getItem" | "setItem">;
export const workbenchKey = (user: string) => `kuizfit:workbench:v1:${user}`;
export function localWorkbench(storage: Store, key: string) {
  return readWorkbench(
    storage.getItem(`${key}:drafts`) ?? storage.getItem(key),
  );
}
export function readSnapshot(raw: unknown): WorkbenchSnapshot {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("revision" in raw) ||
    !("state" in raw) ||
    !Number.isSafeInteger(raw.revision) ||
    Number(raw.revision) < 0
  )
    throw Error("云端计划读取失败，未覆盖本地计划。");
  return {
    state: readWorkbench(JSON.stringify(raw.state)),
    revision: Number(raw.revision),
  };
}

/** Reads are mandatory before writes. Reconcile again if an edit happens while awaiting I/O. */
export async function syncWorkbenchOnce(
  user: string,
  storage: Store,
  get: () => Promise<unknown>,
  save: (snapshot: WorkbenchSnapshot) => Promise<unknown>,
  active: () => boolean = () => true,
) {
  const key = workbenchKey(user);
  const local = localWorkbench(storage, key);
  const baseRaw = storage.getItem(`${key}:cloud-base`);
  const base = baseRaw
    ? readSnapshot(JSON.parse(baseRaw)).state
    : emptyWorkbench();
  const remote = readSnapshot(await get());
  if (!active()) return false;
  const merged = mergeWorkbenches(base, local, remote.state);
  // Backup is per origin and account. Never replace it on subsequent syncs.
  if (!storage.getItem(`${key}:before-cloud-sync`))
    storage.setItem(`${key}:before-cloud-sync`, JSON.stringify(local));
  const saved = equal(merged, remote.state)
    ? remote
    : readSnapshot(await save({ state: merged, revision: remote.revision }));
  if (!active()) return false;
  const current = localWorkbench(storage, key);
  const next = mergeWorkbenches(local, current, saved.state);
  // Write local data before advancing its acknowledged baseline.
  if (!equal(next, current)) {
    storage.setItem(`${key}:drafts`, JSON.stringify(next));
    storage.setItem(key, JSON.stringify(persistedWorkbench(next)));
  }
  storage.setItem(`${key}:cloud-base`, JSON.stringify(saved));
  return !equal(next, current);
}
