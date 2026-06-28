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
});
