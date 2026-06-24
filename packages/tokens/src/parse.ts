import type { Token } from "./types";

export class TokenParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
  ) {
    super(`token parse error (line ${line}): ${message}`);
    this.name = "TokenParseError";
  }
}

// `name: value` per line. Blank lines and `#` comments are skipped. A `@bp`
// suffix on the name records a per-breakpoint override, e.g. `space.md@sm: 0.5rem`.
const LINE = /^([^:@]+?)(?:@([^:]+))?\s*:\s*(.+)$/;

export function parseTokens(source: string): Token[] {
  const byName = new Map<string, Token>();
  const order: string[] = [];

  source.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;

    const match = LINE.exec(line);
    if (!match)
      throw new TokenParseError(`expected "name: value", got "${line}"`, i + 1);

    const name = match[1]!.trim();
    const breakpoint = match[2]?.trim();
    const value = match[3]!.trim();
    if (!name) throw new TokenParseError("empty token name", i + 1);

    let token = byName.get(name);
    if (!token) {
      token = { name, value: "" };
      byName.set(name, token);
      order.push(name);
    }

    if (breakpoint) {
      (token.breakpoints ??= {})[breakpoint] = value;
    } else {
      token.value = value;
    }
  });

  return order.map((name) => byName.get(name) as Token);
}
