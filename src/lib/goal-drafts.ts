// Each tab owns a separate durable outbox. Concurrent tabs cannot erase each
// other's unsent input by overwriting one localStorage key.
export function goalDraftStorage(
  local: Storage,
  session: Storage,
  user: string,
  uuid: () => string,
) {
  let tab = session.getItem("kuiz-body-editor");
  if (!tab) {
    tab = uuid();
    session.setItem("kuiz-body-editor", tab);
  }
  const prefix = `kuiz-body-draft:${user}`;
  const key = `${prefix}:${tab}`;
  let adopted: { key: string; raw: string } | undefined;
  function pending(raw: string) {
    try {
      const saved = JSON.parse(raw);
      return Boolean(
        saved.flight ||
        Object.values(saved.drafts ?? {}).some(
          (value) => value && Object.keys(value).length,
        ),
      );
    } catch {
      return true;
    }
  }
  return {
    read() {
      const own = local.getItem(key);
      if (own) return own;
      for (let i = 0; i < local.length; i++) {
        const candidate = local.key(i);
        if (
          !candidate ||
          !(candidate === prefix || candidate.startsWith(prefix + ":"))
        )
          continue;
        const raw = local.getItem(candidate);
        if (raw && pending(raw)) {
          adopted = { key: candidate, raw };
          // Another tab may still own it: show the recovered input but require
          // explicit retry before applying it, rather than replaying old intent.
          return JSON.stringify({ ...JSON.parse(raw), recovered: true });
        }
      }
      return null;
    },
    write(value: string) {
      local.setItem(key, value);
      if (
        adopted &&
        !pending(value) &&
        local.getItem(adopted.key) === adopted.raw
      ) {
        local.removeItem(adopted.key);
        adopted = undefined;
      }
    },
    prefix,
    key,
  };
}
