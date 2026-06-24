import { describe, expect, it } from "vitest";
import type { CollectionDef } from "./index";
import { schemaForCollection, validateEntryData } from "./index";

const posts: CollectionDef = {
  name: "posts",
  path: "content/posts/**/*.mdx",
  fields: {
    title: { kind: "string", required: true },
    draft: { kind: "boolean" },
    status: { kind: "enum", options: ["draft", "published"], required: true },
  },
};

describe("validateEntryData", () => {
  it("accepts valid data and leaves optional fields off", () => {
    expect(validateEntryData(posts, { title: "Hi", status: "published" })).toEqual({
      title: "Hi",
      status: "published",
    });
  });

  it("rejects a missing required field", () => {
    expect(() => validateEntryData(posts, { title: "Hi" })).toThrow();
  });

  it("rejects an out-of-set enum value", () => {
    expect(() =>
      validateEntryData(posts, { title: "Hi", status: "archived" }),
    ).toThrow();
  });

  it("rejects a wrong type", () => {
    expect(() => validateEntryData(posts, { title: 1, status: "draft" })).toThrow();
  });
});

describe("schemaForCollection", () => {
  it("throws for an enum field without options", () => {
    expect(() =>
      schemaForCollection({
        name: "x",
        path: "x",
        fields: { k: { kind: "enum", required: true } },
      }),
    ).toThrow();
  });
});
