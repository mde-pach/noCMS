import type { Token } from "./types";

/** `color.brand.500` → `--color-brand-500` */
export function cssVarName(dotted: string): string {
  return dotted.startsWith("--") ? dotted : `--${dotted.replace(/\./g, "-")}`;
}

function block(selector: string, decls: [string, string][]): string {
  const body = decls
    .map(([name, value]) => `  ${cssVarName(name)}: ${value};`)
    .join("\n");
  return `${selector} {\n${body}\n}\n`;
}

/**
 * The runtime theming path: a token edit is a CSS-variable swap, never a rebuild.
 * Base values land in `:root`; each mode's `@mode` overrides land in a scoped
 * `[data-theme="<mode>"]` block, so flipping `data-theme` restyles with no re-render.
 */
export function toCssVariables(tokens: Token[]): string {
  const root = block(
    ":root",
    tokens.map((t) => [t.name, t.value]),
  );

  const modes = new Map<string, [string, string][]>();
  for (const token of tokens) {
    for (const [mode, value] of Object.entries(token.modes ?? {})) {
      const decls = modes.get(mode) ?? [];
      decls.push([token.name, value]);
      modes.set(mode, decls);
    }
  }

  const scoped = [...modes].map(([mode, decls]) =>
    block(`[data-theme="${mode}"]`, decls),
  );
  return [root, ...scoped].join("\n");
}
