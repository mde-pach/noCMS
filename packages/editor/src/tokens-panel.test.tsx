// @vitest-environment happy-dom

import { parseTokens, toCssVariables } from "@nocms/tokens";
import { render } from "preact";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TokensPanel, type TokensPanelProps } from "./tokens-panel.js";

const source = `color.brand.500: #3b82f6
color.text: #111827
font.body: system-ui, sans-serif
space.md: 1rem
radius.md: 0.5rem
`;

let container: HTMLElement;
let onChange: ReturnType<typeof vi.fn<TokensPanelProps["onChange"]>>;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  onChange = vi.fn();
  render(<TokensPanel tokens={parseTokens(source)} onChange={onChange} />, container);
});

function field(name: string): HTMLInputElement {
  const el = container.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`no token field ${name}`);
  return el as HTMLInputElement;
}

describe("TokensPanel", () => {
  test("renders one labeled, grouped field per present token, skipping absent ones", () => {
    expect(container.querySelector('[name="color.brand.500"]')).not.toBeNull();
    expect(container.querySelector('[name="font.body"]')).not.toBeNull();
    // color.brand.600 / font.heading / space.sm aren't in this document → not rendered.
    expect(container.querySelector('[name="color.brand.600"]')).toBeNull();
    expect(container.querySelector(".nocms-tokens-title")?.textContent).toBe("Color");
  });

  test("color tokens use a color input, dimensions a text input", () => {
    expect(field("color.brand.500").type).toBe("color");
    expect(field("space.md").type).toBe("text");
  });

  test("editing a token updates the CSS var output and the flat text round-trips", () => {
    const brand = field("color.brand.500");
    brand.value = "#ff0000";
    brand.dispatchEvent(new Event("input", { bubbles: true }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [next, flat, css] = onChange.mock.calls[0] as [
      Parameters<typeof toCssVariables>[0],
      string,
      string,
    ];
    expect(css).toContain("--color-brand-500: #ff0000;");
    expect(flat).toContain("color.brand.500: #ff0000");
    // The flat source round-trips and reflects the edit.
    expect(parseTokens(flat)).toEqual(next);
    expect(toCssVariables(parseTokens(flat))).toBe(css);
  });
});
