import { describe, expect, it } from "vitest";
import {
  COLOR_ROLES,
  contractTokenNames,
  cssVarName,
  DEFAULT_TOKENS,
  formatTokens,
  isMode,
  missingContractTokens,
  parseTokens,
  RAMPS,
  TokenParseError,
  toCssVariables,
  toDtcg,
  toTailwindTheme,
} from "./index";

describe("toTailwindTheme", () => {
  it("maps token namespaces to Tailwind theme keys that point at the runtime vars", () => {
    const tokens = parseTokens(
      "color.primary: #2563eb\nspace.3: 1rem\ntext.lg: 1.25rem\nradius.md: 0.5rem",
    );
    const css = toTailwindTheme(tokens);
    expect(css).toContain("@theme inline {");
    expect(css).toContain("--color-primary: var(--color-primary);");
    expect(css).toContain("--spacing-3: var(--space-3);"); // space → spacing
    expect(css).toContain("--text-lg: var(--text-lg);");
    expect(css).toContain("--radius-md: var(--radius-md);");
  });

  it("emits a theme key for every token in the default set", () => {
    const css = toTailwindTheme(parseTokens(DEFAULT_TOKENS));
    // every base token (no `@mode`/`@breakpoint` qualifier) yields one `var(--…)` declaration
    const tokenCount = parseTokens(DEFAULT_TOKENS).length;
    expect(css.match(/: var\(--/g)?.length).toBe(tokenCount);
  });
});

describe("parseTokens", () => {
  it("parses name: value lines, skipping blanks and comments", () => {
    const tokens = parseTokens(`
# theme
color.brand.500: #3b82f6

space.md: 1rem
`);
    expect(tokens).toEqual([
      { name: "color.brand.500", value: "#3b82f6" },
      { name: "space.md", value: "1rem" },
    ]);
  });

  it("preserves source order and trims whitespace", () => {
    const tokens = parseTokens("b:   2\na: 1");
    expect(tokens.map((t) => t.name)).toEqual(["b", "a"]);
    expect(tokens[0]?.value).toBe("2");
  });

  it("records @breakpoint overrides on the base token", () => {
    const [token] = parseTokens("space.md: 1rem\nspace.md@sm: 0.5rem");
    expect(token).toEqual({
      name: "space.md",
      value: "1rem",
      breakpoints: { sm: "0.5rem" },
    });
  });

  it("records @mode overrides separately from breakpoints (D12)", () => {
    const [token] = parseTokens(
      "color.primary: #2563eb\ncolor.primary@dark: #60a5fa\ncolor.primary@md: #1d4ed8",
    );
    expect(token).toEqual({
      name: "color.primary",
      value: "#2563eb",
      modes: { dark: "#60a5fa" },
      breakpoints: { md: "#1d4ed8" },
    });
  });

  it("does not require a base value before a @mode override", () => {
    const [token] = parseTokens("color.accent@dark: #a78bfa\ncolor.accent: #7c3aed");
    expect(token).toEqual({
      name: "color.accent",
      value: "#7c3aed",
      modes: { dark: "#a78bfa" },
    });
  });

  it("throws TokenParseError with the line number on a malformed line", () => {
    expect(() => parseTokens("ok: 1\nnope")).toThrowError(TokenParseError);
    try {
      parseTokens("ok: 1\nnope");
    } catch (err) {
      expect((err as TokenParseError).line).toBe(2);
    }
  });
});

describe("cssVarName", () => {
  it("converts dotted names and leaves css vars untouched", () => {
    expect(cssVarName("color.brand.500")).toBe("--color-brand-500");
    expect(cssVarName("--already-var")).toBe("--already-var");
  });
});

describe("toCssVariables", () => {
  it("emits a :root block of custom properties", () => {
    const css = toCssVariables(parseTokens("color.text: #111\nspace.md: 1rem"));
    expect(css).toBe(":root {\n  --color-text: #111;\n  --space-md: 1rem;\n}\n");
  });

  it("emits a scoped [data-theme] block for @mode overrides only (D12)", () => {
    const css = toCssVariables(
      parseTokens(
        "color.bg: #fff\ncolor.bg@dark: #000\ncolor.text: #111\ncolor.text@dark: #eee",
      ),
    );
    expect(css).toBe(
      ":root {\n  --color-bg: #fff;\n  --color-text: #111;\n}\n\n" +
        '[data-theme="dark"] {\n  --color-bg: #000;\n  --color-text: #eee;\n}\n',
    );
  });

  it("scopes only the roles that carry a @mode value (incremental dark mode)", () => {
    const css = toCssVariables(
      parseTokens("color.bg: #fff\ncolor.bg@dark: #000\nspace.3: 1rem"),
    );
    expect(css).toContain(":root {\n  --color-bg: #fff;\n  --space-3: 1rem;\n}");
    expect(css).toContain('[data-theme="dark"] {\n  --color-bg: #000;\n}');
    const dark = css.slice(css.indexOf("[data-theme"));
    expect(dark).not.toContain("--space-3");
  });

  it("emits no scoped block when no token has a @mode override", () => {
    const css = toCssVariables(parseTokens("color.bg: #fff"));
    expect(css).toBe(":root {\n  --color-bg: #fff;\n}\n");
  });
});

describe("toDtcg", () => {
  it("nests by dotted segments with $value and inferred $type", () => {
    const dtcg = toDtcg(parseTokens("color.brand.500: #3b82f6\nspace.md: 1rem"));
    expect(dtcg).toEqual({
      color: { brand: { "500": { $value: "#3b82f6", $type: "color" } } },
      space: { md: { $value: "1rem", $type: "dimension" } },
    });
  });

  it("omits $type for unknown groups", () => {
    const dtcg = toDtcg(parseTokens("custom.thing: 42")) as Record<string, unknown>;
    expect(dtcg).toEqual({ custom: { thing: { $value: "42" } } });
  });

  it("types the type-size ramp as dimension and leaves shadows untyped", () => {
    const dtcg = toDtcg(parseTokens("text.lg: 1.25rem\nshadow.sm: 0 1px 2px #0001"));
    expect(dtcg).toEqual({
      text: { lg: { $value: "1.25rem", $type: "dimension" } },
      shadow: { sm: { $value: "0 1px 2px #0001" } },
    });
  });

  it("carries @mode variants under $extensions, base $value stays canonical (D12)", () => {
    const dtcg = toDtcg(
      parseTokens("color.primary: #2563eb\ncolor.primary@dark: #60a5fa"),
    );
    expect(dtcg).toEqual({
      color: {
        primary: {
          $value: "#2563eb",
          $type: "color",
          $extensions: { "com.nocms.modes": { dark: "#60a5fa" } },
        },
      },
    });
  });
});

describe("formatTokens", () => {
  it("emits one name: value line per token", () => {
    const text = formatTokens([
      { name: "color.text", value: "#111" },
      { name: "space.md", value: "1rem" },
    ]);
    expect(text).toBe("color.text: #111\nspace.md: 1rem\n");
  });

  it("emits @breakpoint overrides after the base line", () => {
    const text = formatTokens([
      { name: "space.md", value: "1rem", breakpoints: { sm: "0.5rem" } },
    ]);
    expect(text).toBe("space.md: 1rem\nspace.md@sm: 0.5rem\n");
  });

  it("emits @mode overrides after the base line", () => {
    const text = formatTokens([
      { name: "color.primary", value: "#2563eb", modes: { dark: "#60a5fa" } },
    ]);
    expect(text).toBe("color.primary: #2563eb\ncolor.primary@dark: #60a5fa\n");
  });

  it("round-trips: parseTokens ∘ formatTokens is identity", () => {
    const tokens = parseTokens(`
color.brand.500: #3b82f6
font.body: system-ui, sans-serif
space.md: 1rem
space.md@sm: 0.5rem
`);
    expect(parseTokens(formatTokens(tokens))).toEqual(tokens);
  });

  it("round-trips tokens carrying both @mode and @breakpoint overrides", () => {
    const tokens = parseTokens(DEFAULT_TOKENS);
    expect(parseTokens(formatTokens(tokens))).toEqual(tokens);
  });
});

describe("role contract", () => {
  it("exposes the eight color roles", () => {
    expect(COLOR_ROLES).toEqual([
      "bg",
      "surface",
      "text",
      "muted",
      "primary",
      "on-primary",
      "border",
      "accent",
    ]);
  });

  it("identifies modes but not breakpoints as @mode qualifiers", () => {
    expect(isMode("dark")).toBe(true);
    expect(isMode("md")).toBe(false);
    expect(isMode("sm")).toBe(false);
  });

  it("lists every canonical role and ramp-step token name", () => {
    const names = contractTokenNames();
    expect(names).toContain("color.on-primary");
    expect(names).toContain("space.1");
    expect(names).toContain("text.2xl");
    expect(names).toContain("radius.full");
    const rampSteps = Object.values(RAMPS).reduce((n, steps) => n + steps.length, 0);
    expect(names).toHaveLength(COLOR_ROLES.length + rampSteps);
  });

  it("reports which contract tokens a theme is missing", () => {
    const partial = parseTokens("color.bg: #fff\nspace.1: 0.25rem");
    const missing = missingContractTokens(partial);
    expect(missing).toContain("color.primary");
    expect(missing).not.toContain("color.bg");
    expect(missing).not.toContain("space.1");
  });

  it("DEFAULT_TOKENS is a complete, parseable assignment of the contract", () => {
    const tokens = parseTokens(DEFAULT_TOKENS);
    expect(missingContractTokens(tokens)).toEqual([]);
  });

  it("DEFAULT_TOKENS gives every color role a @dark variant and ramps none", () => {
    const tokens = parseTokens(DEFAULT_TOKENS);
    for (const token of tokens) {
      if (token.name.startsWith("color."))
        expect(token.modes).toEqual({ dark: expect.any(String) });
      else expect(token.modes).toBeUndefined();
    }
  });
});
