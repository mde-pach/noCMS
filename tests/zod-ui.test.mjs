import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { enumOptions, listItemShape, uiMeta, unwrapType } from "../editor/zod-ui.mjs";

test("peels wrappers to reach the real type", () => {
  assert.equal(unwrapType(z.string().optional()).def.type, "string");
  assert.equal(unwrapType(z.array(z.string()).default([])).def.type, "array");
  assert.equal(unwrapType(z.enum(["a"]).default("a")).def.type, "enum");
});

test("finds enum options through a default wrapper", () => {
  assert.deepEqual(enumOptions(z.enum(["left", "center"]).default("left")), [
    "left",
    "center",
  ]);
  assert.equal(enumOptions(z.string()), null, "not an enum");
});

test("finds list item fields through a default wrapper", () => {
  const schema = z.array(z.object({ title: z.string(), body: z.string() })).default([]);
  assert.deepEqual(Object.keys(listItemShape(schema)), ["title", "body"]);
  assert.equal(listItemShape(z.string()), null, "not a list");
});

test("does not peel past the type it is asked about", () => {
  // The accidental .unwrap() chain peeled an array straight into its element.
  const schema = z.array(z.object({ title: z.string() })).default([]);
  assert.equal(
    unwrapType(schema).def.type,
    "array",
    "stops at the array, not the object",
  );
});

test("reads the UI intent a section author attached", () => {
  assert.deepEqual(uiMeta(z.string().meta({ field: "richtext" })), {
    field: "richtext",
  });
  assert.deepEqual(uiMeta(z.string()), {});
});
