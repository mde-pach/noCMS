import { isMode } from "./roles";
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

// `name: value` per line. Blank lines and `#` comments are skipped. A `@<q>`
// suffix on the name records an override: a per-mode one when `<q>` is a mode
// (`color.primary@dark`), otherwise a per-breakpoint one (`space.3@md`).
const LINE = /^([^:@]+?)(?:@([^:]+))?\s*:\s*(.+)$/;

export function parseTokens(source: string): Token[] {
  const byName = new Map<string, Token>();
  const order: string[] = [];

  source.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;

    const match = LINE.exec(line);
    if (!match || match[1] === undefined || match[3] === undefined) {
      throw new TokenParseError(`expected "name: value", got "${line}"`, i + 1);
    }

    const name = match[1].trim();
    const qualifier = match[2]?.trim();
    const value = match[3].trim();
    if (!name) throw new TokenParseError("empty token name", i + 1);

    let token = byName.get(name);
    if (!token) {
      token = { name, value: "" };
      byName.set(name, token);
      order.push(name);
    }

    if (qualifier && isMode(qualifier)) {
      if (!token.modes) token.modes = {};
      token.modes[qualifier] = value;
    } else if (qualifier) {
      if (!token.breakpoints) token.breakpoints = {};
      token.breakpoints[qualifier] = value;
    } else {
      token.value = value;
    }
  });

  return order.map((name) => byName.get(name) as Token);
}
