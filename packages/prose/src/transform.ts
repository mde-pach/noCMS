import type { PhrasingContent } from "mdast";
import type {
  Mark,
  MarkType,
  Node as ProseMirrorNode,
  Schema,
} from "prosemirror-model";

/** Resolve a mark type the prose schema is required to declare (narrows away `undefined`). */
export function requireMark(schema: Schema, name: string): MarkType {
  const mark = schema.marks[name];
  if (!mark) throw new Error(`Prose schema is missing the "${name}" mark`);
  return mark;
}

// The bidirectional bridge between a prose span's mdast inline content and a ProseMirror
// document. mdast stays the source of truth: we build a transient PM doc from inline nodes
// and serialize it back, so an edit mutates mdast rather than re-deriving it. The whole
// correctness property is that this round-trip is lossless — text, marks, and the inline MDX
// atoms must survive untouched.

/** Detach an mdast node so the PM atom never shares a mutable reference with the host's tree. */
function cloneNode<T>(node: T): T {
  return structuredClone(node);
}

/**
 * Build a ProseMirror doc from a prose span's mdast inline nodes. Marks (`strong`,
 * `emphasis`, `link`, and `inlineCode` as a `code` mark) accumulate as we descend; the inline
 * MDX atoms become atom nodes carrying their source mdast node verbatim.
 */
export function mdastInlineToDoc(
  nodes: PhrasingContent[],
  schema: Schema,
): ProseMirrorNode {
  return schema.node("doc", null, inlineToPM(nodes, schema, []));
}

function inlineToPM(
  nodes: PhrasingContent[],
  schema: Schema,
  marks: readonly Mark[],
): ProseMirrorNode[] {
  const out: ProseMirrorNode[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "text": {
        // PM forbids empty text nodes; an empty mdast text carries nothing to preserve.
        if (node.value.length > 0) out.push(schema.text(node.value, marks));
        break;
      }
      case "inlineCode": {
        const withCode = requireMark(schema, "code").create().addToSet(marks);
        if (node.value.length > 0) out.push(schema.text(node.value, withCode));
        break;
      }
      case "strong":
        out.push(
          ...inlineToPM(
            node.children,
            schema,
            requireMark(schema, "strong").create().addToSet(marks),
          ),
        );
        break;
      case "emphasis":
        out.push(
          ...inlineToPM(
            node.children,
            schema,
            requireMark(schema, "em").create().addToSet(marks),
          ),
        );
        break;
      case "link": {
        const mark = requireMark(schema, "link").create({
          href: node.url,
          title: node.title ?? null,
        });
        out.push(...inlineToPM(node.children, schema, mark.addToSet(marks)));
        break;
      }
      case "break":
        out.push(schema.node("break", null, undefined, marks));
        break;
      case "mdxJsxTextElement":
        out.push(
          schema.node("mdxJsxText", { node: cloneNode(node) }, undefined, marks),
        );
        break;
      case "mdxTextExpression":
        out.push(
          schema.node("mdxExpression", { node: cloneNode(node) }, undefined, marks),
        );
        break;
      default:
        out.push(
          schema.node("unknownInline", { node: cloneNode(node) }, undefined, marks),
        );
        break;
    }
  }
  return out;
}

interface InlineItem {
  /** Wrapping marks in canonical (schema) order, `code` excluded — it shapes the leaf. */
  marks: Mark[];
  leaf: PhrasingContent;
}

/**
 * Serialize a ProseMirror doc back to mdast inline nodes. PM stores a node's marks as an
 * unordered set; we re-nest them deterministically in schema order (link ⊃ emphasis ⊃ strong),
 * which matches remark's own inline nesting. The `code` mark turns a text leaf into an
 * `inlineCode` node rather than wrapping it (mdast models inline code as a leaf, not a mark).
 */
export function docToMdastInline(doc: ProseMirrorNode): PhrasingContent[] {
  const codeMark = requireMark(doc.type.schema, "code");
  const items: InlineItem[] = [];
  doc.forEach((child) => {
    const hasCode = codeMark.isInSet(child.marks) != null;
    const marks = child.marks.filter((m) => m.type !== codeMark);
    items.push({ marks, leaf: leafFor(child, hasCode) });
  });
  return nest(items, 0);
}

function leafFor(node: ProseMirrorNode, hasCode: boolean): PhrasingContent {
  if (node.isText) {
    const value = node.text ?? "";
    return hasCode ? { type: "inlineCode", value } : { type: "text", value };
  }
  switch (node.type.name) {
    case "break":
      return { type: "break" };
    case "mdxJsxText":
    case "mdxExpression":
    case "unknownInline":
      return cloneNode(node.attrs.node as PhrasingContent);
    default:
      throw new Error(`Unhandled inline node in prose doc: ${node.type.name}`);
  }
}

/** Group consecutive items sharing the mark at `depth` and recurse, building nested mdast. */
function nest(items: InlineItem[], depth: number): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  let i = 0;
  while (i < items.length) {
    const item = items[i];
    if (!item) break;
    const mark = item.marks[depth];
    if (!mark) {
      out.push(item.leaf);
      i++;
      continue;
    }
    let j = i + 1;
    while (j < items.length) {
      const next = items[j]?.marks[depth];
      if (!next?.eq(mark)) break;
      j++;
    }
    out.push(wrapMark(mark, nest(items.slice(i, j), depth + 1)));
    i = j;
  }
  return out;
}

function wrapMark(mark: Mark, children: PhrasingContent[]): PhrasingContent {
  switch (mark.type.name) {
    case "strong":
      return { type: "strong", children };
    case "em":
      return { type: "emphasis", children };
    case "link":
      return {
        type: "link",
        url: mark.attrs.href as string,
        title: (mark.attrs.title as string | null) ?? null,
        children,
      };
    default:
      throw new Error(`Unhandled mark in prose doc: ${mark.type.name}`);
  }
}
