import type { QueryClient, Query } from "@tanstack/react-query";
import type { Session } from "./domain";
import { resourceKey, type ResourceChange } from "./resource-keys";
import type { CalendarDayState } from "./calendar";
import {
  trainingPaths,
  TRAINING_FROM,
  TRAINING_TO,
  type CalendarTraining,
} from "./training-queries";

function params(query: Query) {
  return new URLSearchParams(String(query.queryKey[1]).split("?")[1]);
}
const belongs = (q: Query, user: string) => q.queryKey[0] === user;
function matches(s: Session, p: URLSearchParams) {
  if (p.has("id")) return s.id === p.get("id") && !s.deleted_at;
  return (
    s.training_date >= (p.get("from") ?? TRAINING_FROM) &&
    s.training_date <= (p.get("to") ?? TRAINING_TO) &&
    Boolean(s.deleted_at) === (p.get("deleted") === "1") &&
    (p.get("planned") !== "1" || s.status === "planned") &&
    (p.get("active") !== "1" || ["in_progress", "paused"].includes(s.status)) &&
    (!p.has("type") || s.training_type === p.get("type"))
  );
}
function compare(a: Session, b: Session) {
  return (
    a.training_date.localeCompare(b.training_date) ||
    (a.created_at ?? "").localeCompare(b.created_at ?? "") ||
    a.id.localeCompare(b.id)
  );
}
export async function applyResourceChange(
  client: QueryClient,
  user: string,
  change: ResourceChange,
) {
  // A response started under a previous account cannot seed the current cache.
  if (change.owner !== user) return;
  if (change.resource === "calendar") {
    const state = change.result as CalendarDayState;
    if (!state?.training_date || !Array.isArray(state.rows)) return;
    const ids = new Set(state.affected_ids ?? []);
    const affected = (q: Query) => {
      if (!belongs(q, user) || !String(q.queryKey[1]).startsWith("sessions?"))
        return false;
      const p = params(q);
      if (p.has("id")) return ids.has(p.get("id")!);
      if (p.get("active") === "1") return false;
      return (
        state.training_date >= (p.get("from") ?? TRAINING_FROM) &&
        state.training_date <= (p.get("to") ?? TRAINING_TO)
      );
    };
    await client.cancelQueries({ predicate: affected });
    for (const q of client.getQueryCache().findAll({ predicate: affected })) {
      if (params(q).get("view") !== "calendar" || !Array.isArray(q.state.data))
        continue;
      client.setQueryData(q.queryKey, [
        ...(q.state.data as CalendarTraining[]).filter(
          (r) => r.training_date !== state.training_date,
        ),
        ...state.rows.map((r) => ({
          ...r,
          locked: state.locked,
          day_revision: state.version,
        })),
      ]);
    }
    await client.invalidateQueries(
      {
        predicate: (q) => affected(q) && params(q).get("view") !== "calendar",
        refetchType: "active",
      },
      { cancelRefetch: false },
    );
    return;
  }
  const training = ["sessions", "imports"].includes(change.resource);
  const resourceAffected = (q: Query) =>
    belongs(q, user) &&
    (training
      ? /^(sessions|history)(\?|$)/.test(String(q.queryKey[1]))
      : String(q.queryKey[1]).split(/[/?]/)[0] === change.resource);
  if (!training) {
    await client.invalidateQueries(
      { predicate: resourceAffected, refetchType: "none" },
      { cancelRefetch: false },
    );
    return;
  }
  const input = change.data as
    (Partial<Session> & { restore?: boolean }) | undefined;
  const result = change.result as { revision?: number } | undefined;
  const findPrevious = () =>
    input?.id
      ? (client
          .getQueryCache()
          .findAll({ predicate: resourceAffected })
          .flatMap((q) => (Array.isArray(q.state.data) ? q.state.data : []))
          .filter(
            (s: Session) => s.id === input.id && Array.isArray(s.exercises),
          )
          .sort((a: Session, b: Session) => b.revision - a.revision)[0] as
          Session | undefined)
      : undefined;
  const previous = findPrevious();
  let saved: Session | undefined;
  if (change.resource === "sessions" && input?.id && result?.revision) {
    if (change.method === "POST" && Array.isArray(input.exercises))
      saved = {
        ...previous,
        ...input,
        created_at: previous?.created_at ?? new Date().toISOString(),
        revision: result.revision,
      } as Session;
    if (change.method === "PATCH" && previous)
      saved = {
        ...previous,
        revision: result.revision,
        deleted_at: input.restore ? null : new Date().toISOString(),
      };
  }
  const scopedSession = saved;
  const affected = (q: Query) => {
    if (!resourceAffected(q)) return false;
    if (!scopedSession || (!previous && input?.revision !== 0)) return true;
    if (String(q.queryKey[1]).startsWith("history?")) return true;
    return (
      matches(scopedSession, params(q)) ||
      Boolean(previous && matches(previous, params(q)))
    );
  };
  await client.cancelQueries({ predicate: affected });
  if (saved && (findPrevious()?.revision ?? 0) > saved.revision)
    saved = undefined;
  if (saved) {
    const session = saved;
    for (const query of client
      .getQueryCache()
      .findAll({ predicate: affected })) {
      const old = query.state.data;
      if (
        !Array.isArray(old) ||
        !String(query.queryKey[1]).startsWith("sessions?")
      )
        continue;
      const p = params(query);
      if (p.get("view") === "calendar") {
        if (!previous && input?.revision !== 0) continue;
        const rows = (old as CalendarTraining[]).map((r) => ({ ...r }));
        for (const [s, delta] of [
          [previous, -1],
          [session, 1],
        ] as const) {
          if (
            !s ||
            s.deleted_at ||
            s.training_date < p.get("from")! ||
            s.training_date > p.get("to")!
          )
            continue;
          const found = rows.find(
            (r) =>
              r.training_date === s.training_date &&
              r.training_type === s.training_type &&
              r.status === s.status,
          );
          if (found) found.count += delta;
          else if (delta > 0)
            rows.push({
              training_date: s.training_date,
              training_type: s.training_type,
              status: s.status,
              count: 1,
            });
        }
        client.setQueryData(
          query.queryKey,
          rows.filter((r) => r.count > 0),
        );
      } else if (Number(p.get("offset") ?? 0) === 0) {
        const rows = (old as Session[]).filter((s) => s.id !== session.id);
        if (matches(session, p)) rows.push(session);
        rows.sort(compare);
        if (p.get("order") !== "asc") rows.reverse();
        client.setQueryData(
          query.queryKey,
          rows.slice(0, Number(p.get("limit") ?? 50)),
        );
      }
    }
    client.setQueryData(
      resourceKey(user, trainingPaths.detail(session.id)),
      session.deleted_at ? [] : [session],
    );
  }
  // Inactive pages are marked stale; only mounted readers refetch once.
  await client.invalidateQueries(
    { predicate: affected, refetchType: "active" },
    { cancelRefetch: false },
  );
}
