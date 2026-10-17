export function resourceKey(user: string, path: string) {
  const [resource, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.sort();
  return [user, `${resource}${params.size ? `?${params}` : ""}`] as const;
}
let owner = "";
export const resourceOwner = () => owner;
export const setResourceOwner = (user: string) => {
  owner = user;
};
export type ResourceChange = {
  owner: string;
  resource: string;
  method: string;
  data?: unknown;
  result?: unknown;
};
