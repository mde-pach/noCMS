import type { MdxTextExpression } from "mdast-util-mdx-expression";
import type { MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { Schema } from "prosemirror-model";

/** The element's text, joined from its descendants — what reads as the editable content
 *  (e.g. `<Badge>Row</Badge>` → `Row`). Empty for an icon-only or self-closing element. */
function textContentOf(node: MdxJsxTextElement): string {
  let out = "";
  for (const child of node.children) {
    if (child.type === "text" || child.type === "inlineCode") out += child.value;
    else if ("children" in child)
      out += textContentOf(child as unknown as MdxJsxTextElement);
  }
  return out;
}

/** The source-shaped label for a JSX atom with no text content (icon-only / self-closing) —
 *  the only case where showing the tag is clearer than showing nothing. */
function tagLabel(node: MdxJsxTextElement): string {
  const name = node.name ?? "";
  const attrs = node.attributes
    .map((attr) => {
      if (attr.type === "mdxJsxExpressionAttribute") return `{…}`;
      if (attr.value == null) return attr.name;
      if (typeof attr.value === "string") return `${attr.name}="${attr.value}"`;
      return `${attr.name}={…}`;
    })
    .join(" ");
  const open = attrs ? `${name} ${attrs}` : name;
  return node.children.length === 0 ? `<${open}/>` : `<${open}>…</${name}>`;
}

function labelExpression(node: MdxTextExpression): string {
  return `{${node.value}}`;
}

// Mark declaration order is meaningful: ProseMirror stores a node's marks in schema
// order, and the serializer nests them in that order (link outermost → strong innermost),
// which matches remark's own inline nesting (e.g. `***x***` → emphasis ⊃ strong). `code`
// is last because in mdast it is not a wrapping mark but a leaf (`inlineCode` with a value);
// the serializer consumes it into the leaf rather than wrapping with it.
export const proseSchema = new Schema({
  nodes: {
    doc: { content: "inline*" },
    text: { group: "inline" },
    break: {
      group: "inline",
      inline: true,
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM: () => ["br"],
    },
    mdxJsxText: {
      group: "inline",
      inline: true,
      atom: true,
      // The whole source mdast node, carried verbatim so the atom round-trips exactly.
      attrs: { node: {} },
      // Any inline component (Badge, an inline Button, an icon-with-label, …) renders as one
      // chip. With text content we show that content prefixed by a small name tag, so it reads
      // as "<Name> Row" — not the raw `<Name …>…</Name>` source, which hid the text behind `…`.
      // With no text (self-closing / icon-only) the source tag is the clearest label.
      toDOM: (n) => {
        const node = n.attrs.node as MdxJsxTextElement;
        const text = textContentOf(node).trim();
        const attrs = {
          class: "nocms-prose-atom nocms-prose-atom-jsx",
          "data-mdx-atom": "jsx",
          contenteditable: "false",
          title: tagLabel(node),
        };
        return text
          ? [
              "span",
              attrs,
              ["span", { class: "nocms-prose-atom-tag" }, node.name ?? ""],
              text,
            ]
          : ["span", attrs, tagLabel(node)];
      },
    },
    mdxExpression: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { node: {} },
      toDOM: (n) => [
        "span",
        {
          class: "nocms-prose-atom nocms-prose-atom-expr",
          "data-mdx-atom": "expr",
          contenteditable: "false",
        },
        labelExpression(n.attrs.node as MdxTextExpression),
      ],
    },
    // Any inline mdast not modeled explicitly (inline `image`, raw `html`) is carried
    // verbatim as an opaque atom so nothing is ever dropped on a round-trip.
    unknownInline: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { node: {} },
      toDOM: (n) => [
        "span",
        {
          class: "nocms-prose-atom nocms-prose-atom-unknown",
          "data-mdx-atom": "unknown",
          contenteditable: "false",
        },
        `[${(n.attrs.node as { type: string }).type}]`,
      ],
    },
  },
  marks: {
    link: {
      attrs: { href: {}, title: { default: null } },
      inclusive: false,
      toDOM: (m) => [
        "a",
        {
          href: m.attrs.href as string,
          title: (m.attrs.title as string | null) ?? undefined,
        },
        0,
      ],
      parseDOM: [
        {
          tag: "a[href]",
          getAttrs: (dom) => ({
            href: (dom as HTMLElement).getAttribute("href"),
            title: (dom as HTMLElement).getAttribute("title"),
          }),
        },
      ],
    },
    em: { toDOM: () => ["em", 0], parseDOM: [{ tag: "em" }, { tag: "i" }] },
    strong: { toDOM: () => ["strong", 0], parseDOM: [{ tag: "strong" }, { tag: "b" }] },
    code: { toDOM: () => ["code", 0], parseDOM: [{ tag: "code" }] },
  },
});

export type ProseSchema = typeof proseSchema;
