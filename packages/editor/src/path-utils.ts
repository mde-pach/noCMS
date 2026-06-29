export function setPath(
  root: Record<string, unknown>,
  path: string,
  value: string,
): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const next = cur[keys[i] as string];
    if (!next || typeof next !== "object") return;
    cur = next as Record<string, unknown>;
  }
  cur[keys[keys.length - 1] as string] = value;
}
