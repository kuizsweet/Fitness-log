export const ITEM_LIMIT = 10;
export type ChecklistItem = {
  id: string;
  text: string;
  completed: boolean;
  order: number;
};
export function orderItems(items: ChecklistItem[]): ChecklistItem[] {
  return [
    ...items.filter((item) => !item.completed),
    ...items.filter((item) => item.completed),
  ].map((item, order) => ({ ...item, order }));
}
export function checklistDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function addChecklistExamples(items: ChecklistItem[]): ChecklistItem[] {
  const next = [...items];
  for (const text of ["水杯", "耳机"]) {
    if (next.length >= ITEM_LIMIT) break;
    if (!next.some((item) => item.text.trim() === text))
      next.push({
        id: crypto.randomUUID(),
        text,
        completed: false,
        order: next.length,
      });
  }
  return orderItems(next);
}
export function toggleItem(
  items: ChecklistItem[],
  id: string,
  completed: boolean,
) {
  const updated = items.map((item) =>
    item.id === id ? { ...item, completed } : item,
  );
  // Insert at the nearest boundary: above existing completed items.
  return orderItems(
    completed
      ? [
          ...updated.filter((item) => item.id !== id && !item.completed),
          ...updated.filter((item) => item.id === id),
          ...updated.filter((item) => item.id !== id && item.completed),
        ]
      : updated,
  );
}
export function readChecklist(value: string | null, day = checklistDay()) {
  if (!value) return { items: [], needsReset: false, needsExamples: true };
  const parsed = JSON.parse(value);
  const legacy = Array.isArray(parsed);
  const items = readItems(JSON.stringify(legacy ? parsed : parsed.items));
  const needsReset = !legacy && parsed.day !== day;
  return {
    items: needsReset
      ? items.map((item) => ({ ...item, completed: false }))
      : items,
    needsReset: needsReset || legacy,
    needsExamples: legacy || parsed.examplesInitialized !== true,
  };
}
export function readItems(value: string | null): ChecklistItem[] {
  if (!value) return [];
  const items: unknown = JSON.parse(value);
  if (!Array.isArray(items) || items.length > ITEM_LIMIT)
    throw Error("Invalid list");
  const ids = new Set<string>();
  for (const item of items) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.text !== "string" ||
      !item.text.trim() ||
      item.text.length > 32 ||
      typeof item.completed !== "boolean" ||
      !Number.isInteger(item.order)
    )
      throw Error("Invalid item");
    ids.add(item.id);
  }
  return orderItems(items.sort((a, b) => a.order - b.order));
}
