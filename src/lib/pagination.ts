import type { PostgrestError } from "@supabase/supabase-js";
// A query's range is replaced on each page, and callers supply a stable order.
export async function allRows<T>(query: {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;
}): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const page = await query.range(start, start + 499);
    if (page.error) throw new Error(page.error.message);
    rows.push(...page.data!);
    if (page.data!.length < 500) return rows;
  }
}
