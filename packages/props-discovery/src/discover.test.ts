import { describe, expect, it } from "vitest";
import { bridgeFieldConfig, discoverControls } from "./index";

const BUTTON = `
import type { ComponentChildren } from "preact";

interface ButtonProps {
  label: string;
  count?: number;
  disabled: boolean;
  variant: "primary" | "secondary" | "ghost";
  onClick: () => void;
  children: ComponentChildren;
}

export function Button(props: ButtonProps) {
  return null;
}
`;

describe("discoverControls", () => {
  it("maps each prop type to a control", () => {
    const { component, controls } = discoverControls(BUTTON);
    expect(component).toBe("Button");
    expect(controls).toContainEqual({ prop: "label", kind: "text", required: true });
    expect(controls).toContainEqual({ prop: "count", kind: "number", required: false });
    expect(controls).toContainEqual({
      prop: "disabled",
      kind: "boolean",
      required: true,
    });
    expect(controls).toContainEqual({
      prop: "variant",
      kind: "select",
      options: ["primary", "secondary", "ghost"],
      required: true,
    });
    expect(controls).toContainEqual({
      prop: "onClick",
      kind: "action",
      required: true,
    });
    expect(controls).toContainEqual({ prop: "children", kind: "slot", required: true });
  });

  it("reads an inline props type literal on an arrow component", () => {
    const { component, controls } = discoverControls(
      "export const Card = (props: { title: string }) => null;",
    );
    expect(component).toBe("Card");
    expect(controls).toEqual([{ prop: "title", kind: "text", required: true }]);
  });

  it("selects a named component when several are present", () => {
    const src = `
      export function A(p: { a: string }) { return null; }
      export function B(p: { b: number }) { return null; }
    `;
    expect(discoverControls(src, { component: "B" }).controls).toEqual([
      { prop: "b", kind: "number", required: true },
    ]);
  });

  it("throws when no typed component is found", () => {
    expect(() => discoverControls("export const x = 1;")).toThrow();
  });
});

describe("bridgeFieldConfig", () => {
  it("overlays help and grouping without touching discovered kinds", () => {
    const schema = discoverControls(BUTTON);
    const bridged = bridgeFieldConfig(schema, {
      label: { help: "Shown on the button", group: "Content" },
    });
    const label = bridged.controls.find((c) => c.prop === "label");
    expect(label).toEqual({
      prop: "label",
      kind: "text",
      required: true,
      help: "Shown on the button",
      group: "Content",
    });
  });
});
