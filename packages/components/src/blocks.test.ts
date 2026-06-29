import { deriveControls } from "@nocms/controls";
import { describe, expect, test } from "vitest";
import {
  ButtonSchema,
  ImageSchema,
  registry,
  SectionSchema,
  StackSchema,
} from "./index";

const controlsByKey = (schema: Parameters<typeof deriveControls>[0]) =>
  Object.fromEntries(deriveControls(schema).map((c) => [c.key, c]));

describe("tracer block schemas → controls", () => {
  test("Button: text label, url href, variant select", () => {
    const c = controlsByKey(ButtonSchema);
    expect(c.label?.kind).toBe("text");
    expect(c.label?.required).toBe(true);
    expect(c.href?.kind).toBe("url");
    expect(c.variant?.kind).toBe("select");
    expect(c.variant?.config).toEqual({ options: ["primary", "secondary"] });
    expect(c.variant?.default).toBe("primary");
  });

  test("Image: src is a media picker, alt required, rounded toggle", () => {
    const c = controlsByKey(ImageSchema);
    expect(c.src?.kind).toBe("image");
    expect(c.alt?.kind).toBe("text");
    expect(c.alt?.required).toBe(true);
    expect(c.width?.kind).toBe("number");
    expect(c.width?.required).toBe(false);
    expect(c.rounded?.kind).toBe("boolean");
  });

  test("Section & Stack: only selects, both optional with defaults", () => {
    const section = controlsByKey(SectionSchema);
    expect(section.tone?.kind).toBe("select");
    expect(section.padding?.default).toBe("lg");

    const stack = controlsByKey(StackSchema);
    expect(stack.gap?.kind).toBe("select");
    expect(stack.align?.kind).toBe("select");
  });
});

describe("registry block definitions", () => {
  test("containers declare a children slot; leaves do not", () => {
    expect(registry.Section?.slots).toEqual(["children"]);
    expect(registry.Stack?.slots).toEqual(["children"]);
    expect(registry.Button?.slots).toBeUndefined();
    expect(registry.Image?.slots).toBeUndefined();
  });

  test("the four tracer blocks carry a schema", () => {
    for (const name of ["Section", "Stack", "Button", "Image"] as const) {
      expect(registry[name]?.schema).toBeDefined();
    }
  });
});
