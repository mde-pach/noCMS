import { describe, expect, it } from "vitest";
import {
  cssVarName,
  parseTokens,
  TokenParseError,
  toCssVariables,
  toDtcg,
} from "./index";

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
});
