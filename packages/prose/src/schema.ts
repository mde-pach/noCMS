import type { MdxTextExpression } from "mdast-util-mdx-expression";
import type { MdxJsxTextElement } from "mdast-util-mdx-jsx";
import { Schema } from "prosemirror-model";

/** A readable, non-editable label for an inline JSX atom chip (`<Badge …>`). */
function labelJsxElement(node: MdxJsxTextElement): string {
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
  const selfClosing = node.children.length === 0;
  return selfClosing ? `<${open}/>` : `<${open}>…</${node.name ?? ""}>`;
}

/** A readable, non-editable label for an inline expression atom chip (`{expr}`). */
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
      toDOM: (n) => [
        "span",
        {
          class: "nocms-prose-atom nocms-prose-atom-jsx",
          "data-mdx-atom": "jsx",
          contenteditable: "false",
        },
        labelJsxElement(n.attrs.node as MdxJsxTextElement),
      ],
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
    // Catch-all for any inline mdast we don't model explicitly (e.g. inline `image`,
    // raw `html`): carried verbatim as an opaque atom so nothing is ever dropped on
    // a round-trip — losslessness over a closed node list.
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
