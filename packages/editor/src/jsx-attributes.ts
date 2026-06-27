// Read and write a JSX element's props directly on the mdast node, then re-serialize.
// Props edited in the panel mutate the attribute here; the document stays MDX text, so
// changes are line-mergeable and nothing is re-derived from rendered output.
//
// An attribute value is one of: a string (`label="go"`), an expression
// (`count={3}`, value held as a raw expression string — no estree needed to serialize),
// or null (the boolean shorthand `dark`). Editor controls speak plain JS values; the
// encode/decode between those and the attribute shape lives here.

import type { Nodes } from "mdast";

export type JsxElement = Extract<
  Nodes,
  { type: "mdxJsxFlowElement" } | { type: "mdxJsxTextElement" }
>;

type Attribute = JsxElement["attributes"][number];
type NamedAttribute = Extract<Attribute, { type: "mdxJsxAttribute" }>;

/** A plain prop value a control can render and edit. */
export type PropValue = string | number | boolean;

export function isJsxElement(node: Nodes): node is JsxElement {
  return node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement";
}

function isNamed(attr: Attribute, name: string): boolean {
  return attr.type === "mdxJsxAttribute" && attr.name === name;
}

function decodeExpression(expr: string): PropValue | undefined {
  const text = expr.trim();
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  const quoted = text.match(/^(['"])([\s\S]*)\1$/);
  return quoted?.[2];
}

/**
 * The prop's current value as a plain JS value: the string for `name="s"`, the literal
 * for `name={3}` / `name={true}`, `true` for the shorthand `name`, or undefined when the
 * prop is absent or holds an expression no simple control can represent.
 */
export function getProp(el: JsxElement, name: string): PropValue | undefined {
  const attr = el.attributes.find((a) => isNamed(a, name));
  if (!attr || attr.type !== "mdxJsxAttribute") return undefined;
  const { value } = attr;
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value;
  return decodeExpression(value.value);
}

function encode(name: string, value: PropValue): NamedAttribute {
  const base = { type: "mdxJsxAttribute" as const, name };
  if (typeof value === "string") return { ...base, value };
  if (value === true) return { ...base, value: null };
  return {
    ...base,
    value: { type: "mdxJsxAttributeValueExpression", value: String(value) },
  };
}

/**
 * Set a prop. Strings serialize as `name="..."`, the value `true` as the shorthand
 * `name`, and numbers/`false` as `name={...}`. Replaces an existing attribute in place to
 * keep attribute order stable.
 */
export function setProp(el: JsxElement, name: string, value: PropValue): void {
  const encoded = encode(name, value);
  const index = el.attributes.findIndex((a) => isNamed(a, name));
  if (index === -1) {
    el.attributes.push(encoded);
  } else {
    el.attributes[index] = encoded;
  }
}

export function removeProp(el: JsxElement, name: string): void {
  el.attributes = el.attributes.filter((a) => !isNamed(a, name));
}

/**
 * Build a fresh JSX flow element from a name and plain prop values — the node an insert
 * stamps into the document. `withChildren` opens an (empty) child region for a container
 * so the serializer writes `<Name></Name>` rather than a self-closing leaf.
 */
export function buildJsxElement(
  name: string,
  props: Record<string, PropValue> = {},
  withChildren = false,
): JsxElement {
  return {
    type: "mdxJsxFlowElement",
    name,
    attributes: Object.entries(props).map(([key, value]) => encode(key, value)),
    children: withChildren ? [{ type: "paragraph", children: [] }] : [],
  };
}
