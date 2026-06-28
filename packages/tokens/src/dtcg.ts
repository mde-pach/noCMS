import type { Token } from "./types";

// W3C DTCG `$type`, inferred from the token's top-level group. Unknown groups
// get no `$type` — better to omit than to guess wrong. `shadow` stays untyped:
// our values are CSS shadow strings, not the DTCG composite shadow object.
function inferType(name: string): string | undefined {
  switch (name.split(".")[0]) {
    case "color":
      return "color";
    case "space":
    case "text":
    case "radius":
    case "size":
    case "border":
      return "dimension";
    case "font":
      return "fontFamily";
    default:
      return undefined;
  }
}

/**
 * Nested W3C DTCG generated from the flat tokens, for tooling interop only — and
 * one-way by contract: the flat source is canonical, this is derived, never read
 * back. `@mode` variants ride along under `$extensions` so the export stays
 * non-lossy without inventing a non-standard top-level shape.
 */
export function toDtcg(tokens: Token[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const token of tokens) {
    const parts = token.name.split(".");
    let node = root;
    for (const key of parts.slice(0, -1)) {
      const existing = node[key];
      if (typeof existing !== "object" || existing === null) node[key] = {};
      node = node[key] as Record<string, unknown>;
    }

    const leaf = parts[parts.length - 1] as string;
    const entry: Record<string, unknown> = { $value: token.value };
    const type = inferType(token.name);
    if (type) entry.$type = type;
    if (token.modes && Object.keys(token.modes).length > 0) {
      entry.$extensions = { "com.nocms.modes": { ...token.modes } };
    }
    node[leaf] = entry;
  }

  return root;
}
