// @vitest-environment happy-dom

import { parseTokens, type toCssVariables } from "@nocms/tokens";
import { render } from "preact";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { TokensPanel, type TokensPanelProps } from "./tokens-panel.js";

const source = `color.brand.500: #3b82f6
color.brand.600: #2563eb
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

describe("TokensPanel", () => {
  test("offers the curated swatch palette and a corner-radius slider", () => {
    expect(
      container.querySelectorAll('.nc-swatch[name="color.brand.500"]').length,
    ).toBe(5);
    const radius = container.querySelector('[name="radius.md"]') as HTMLInputElement;
    expect(radius.type).toBe("range");
    // 0.5rem reads back as 8px on the slider.
    expect(radius.value).toBe("8");
  });

  test("picking a swatch sets the brand color and its hover shade, live", () => {
    const slate = container.querySelector(
      '.nc-swatch[name="color.brand.500"][value="#3D5A98"]',
    ) as HTMLElement;
    slate.click();

    expect(onChange).toHaveBeenCalledTimes(1);
    const [next, flat, css] = onChange.mock.calls[0] as [
      Parameters<typeof toCssVariables>[0],
      string,
      string,
    ];
    expect(css).toContain("--color-brand-500: #3D5A98;");
    // the hover shade present in the document is updated alongside the base.
    expect(css).toContain("--color-brand-600: #3D5A98;");
    expect(flat).toContain("color.brand.500: #3D5A98");
    expect(parseTokens(flat)).toEqual(next);
  });

  test("dragging the radius slider rewrites radius.md in px", () => {
    const radius = container.querySelector('[name="radius.md"]') as HTMLInputElement;
    radius.value = "16";
    radius.dispatchEvent(new Event("input", { bubbles: true }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const [, flat, css] = onChange.mock.calls[0] as [unknown, string, string];
    expect(flat).toContain("radius.md: 16px");
    expect(css).toContain("--radius-md: 16px;");
  });
});
