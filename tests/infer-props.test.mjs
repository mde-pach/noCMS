import assert from "node:assert/strict";
import { test } from "node:test";
import { inferFromAstro, inferFromTsx, inferProps } from "../scripts/infer-props.mjs";

test("a React component's props become editable fields", () => {
  const props = inferFromTsx(`
    export default function Button({ variant = "primary", href }: {
      variant?: "primary" | "ghost";
      href?: string;
      children?: ReactNode;
    }) { return null; }
  `);
  assert.deepEqual(props.variant, {
    field: "select",
    options: ["primary", "ghost"],
    default: "primary",
  });
  assert.deepEqual(props.href, { field: "text" });
  assert.equal(
    props.children,
    undefined,
    "children are composed on the canvas, not typed",
  );
});

test("keyof typeof resolves to the object's keys", () => {
  // The shadcn shape: variants declared as an object, the prop typed from its keys.
  const props = inferFromTsx(`
    const VARIANTS = { primary: "a", ghost: "b", danger: "c" } as const;
    export default function Button({ variant }: { variant?: keyof typeof VARIANTS }) { return null; }
  `);
  assert.deepEqual(props.variant.options, ["primary", "ghost", "danger"]);
});

test("types map to the control a person can actually use", () => {
  const props = inferFromTsx(`
    export default function X({ a, b, c }: { a?: string; b?: number; c?: boolean }) { return null; }
  `);
  assert.equal(props.a.field, "text");
  assert.equal(props.b.field, "number");
  assert.equal(props.c.field, "toggle");
});

test("presentational props are not offered as content", () => {
  const props = inferFromTsx(`
    export default function X({ className, style, children, title }: {
      className?: string; style?: object; children?: ReactNode; title?: string;
    }) { return null; }
  `);
  assert.deepEqual(Object.keys(props), ["title"]);
});

test("an .astro component offers what it destructures", () => {
  const props = inferFromAstro(`---
const { brand, count = 2, sticky = true, label = "Go" } = Astro.props;
---
<nav>{brand}</nav>`);
  assert.equal(props.brand.field, "text");
  assert.deepEqual(props.count, { field: "number", default: 2 });
  assert.deepEqual(props.sticky, { field: "toggle", default: true });
  assert.deepEqual(props.label, { field: "text", default: "Go" });
});

test("a component with no props yields none, rather than failing", () => {
  assert.deepEqual(inferFromAstro("<p>hi</p>"), {});
  assert.deepEqual(
    inferProps("", "x.vue"),
    {},
    "unsupported frameworks degrade quietly",
  );
});
