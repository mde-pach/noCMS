import { fileURLToPath } from "node:url";
import { parseTokens, toTailwindTheme } from "@nocms/tokens";
import { describe, expect, it } from "vitest";
import { tailwindCss } from "./tailwind";

// The package dir resolves `tailwindcss` (hoisted to the workspace root), standing in for a site root.
const base = fileURLToPath(new URL("..", import.meta.url));

describe("tailwindCss", () => {
  it("compiles the utilities used in the HTML, bound to the token vars, and tree-shakes the rest", async () => {
    const theme = toTailwindTheme(parseTokens("color.primary: #2563eb\nspace.3: 1rem"));
    const css = await tailwindCss(['<div class="p-3 bg-primary"></div>'], theme, base);

    expect(css).toMatch(/\.p-3\s*\{/);
    expect(css).toContain("var(--space-3)"); // p-3 resolves to the runtime token var, not a copy
    expect(css).toContain("var(--color-primary)"); // bg-primary likewise
    expect(css).not.toMatch(/\.m-3\s*\{/); // an unused utility is absent
  }, 20000);

  // Invariant #1 (preview = publish) lives or dies on the publish engine emitting a rule for every
  // utility *shape* the components produce — a class the build silently drops but the in-page engine
  // keeps is exactly how the two moments diverge. Compile one of each shape and assert none is lost.
  // (The live cross-engine check against @tailwindcss/browser runs in the editor sweep.)
  it("emits a rule for every utility shape the migrated components use", async () => {
    const theme = toTailwindTheme(
      parseTokens(
        "color.brand.500: #4b3fd6\ncolor.text: #211e1a\nspace.md: 1rem\nradius.md: 0.625rem\nfont.body: sans-serif",
      ),
    );
    const shapes = {
      "token color": "bg-brand-500",
      "token spacing": "p-md",
      "token radius": "rounded-md",
      "token font": "font-body",
      "opacity modifier": "border-text/22",
      "arbitrary length": "px-[1.25em]",
      "arbitrary property": "[font:inherit]",
      "hover variant": "hover:-translate-y-px",
      "focus-visible variant": "focus-visible:outline-2",
    };
    const css = await tailwindCss(
      [`<div class="${Object.values(shapes).join(" ")}"></div>`],
      theme,
      base,
    );
    // Tailwind backslash-escapes `/`, `:`, `[`, `.` in selectors (`.border-text\/22`); drop the
    // escapes and substring-match the bare class name (a variant adds a trailing `:hover` etc.).
    const flat = css.replace(/\\/g, "");
    const missing = Object.entries(shapes)
      .filter(([, cls]) => !flat.includes(`.${cls}`))
      .map(([shape]) => shape);
    expect(missing).toEqual([]);
    // the token-bound ones resolve to the runtime vars (so both engines agree, and theming is a swap)
    expect(css).toContain("var(--color-brand-500)");
    expect(css).toContain("var(--space-md)"); // @theme inline → utility points at the runtime var
  }, 20000);
});
