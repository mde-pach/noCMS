import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { fieldsFor } from "../editor/fields.mjs";

const node = (props = {}) => ({
  name: "Button",
  props: Object.fromEntries(
    Object.entries(props).map(([k, v]) => [k, { kind: "text", value: v }]),
  ),
});

test("a component with no descriptor is still editable", () => {
  // The gap this closes: badge and button reported "no properties" and could not be
  // touched, which made an imported library reachable in name only.
  const def = {
    inferred: {
      variant: { field: "select", options: ["primary", "ghost"] },
      href: { field: "text" },
    },
  };
  const fields = fieldsFor(def, node());
  assert.deepEqual(
    fields.map((f) => f.name),
    ["variant", "href"],
  );
  assert.deepEqual(fields[0].options, ["primary", "ghost"]);
  assert.equal(fields[0].source, "inferred");
});

test("a descriptor overrides inference rather than competing with it", () => {
  const def = {
    schema: z.object({ variant: z.string().meta({ field: "select", label: "Style" }) }),
    inferred: { variant: { field: "text" }, href: { field: "text" } },
  };
  const fields = fieldsFor(def, node());
  const variant = fields.find((f) => f.name === "variant");
  assert.equal(variant.source, "schema", "the author's descriptor wins");
  assert.equal(variant.label, "Style");
  assert.ok(
    fields.some((f) => f.name === "href"),
    "inference still fills the gaps",
  );
});

test("a prop written by hand is editable even if nothing declared it", () => {
  const fields = fieldsFor({ inferred: {} }, node({ "data-analytics": "cta" }));
  assert.equal(fields.length, 1);
  assert.equal(fields[0].source, "instance");
});

test("slot is structure, not a property", () => {
  assert.deepEqual(fieldsFor({ inferred: {} }, node({ slot: "left" })), []);
});

test("names become labels a person can read", () => {
  const fields = fieldsFor(
    { inferred: { imageAlt: { field: "text" }, "cta-url": { field: "text" } } },
    node(),
  );
  assert.deepEqual(
    fields.map((f) => f.label),
    ["Image alt", "Cta url"],
  );
});
