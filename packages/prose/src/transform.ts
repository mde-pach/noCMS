import type {
  Blockquote,
  Heading,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  RootContent,
} from "mdast";
import type {
  Mark,
  MarkType,
  Node as ProseMirrorNode,
  Schema,
} from "prosemirror-model";

export function requireMark(schema: Schema, name: string): MarkType {
  const mark = schema.marks[name];
  if (!mark) throw new Error(`Prose schema is missing the "${name}" mark`);
  return mark;
}

// mdast stays the source of truth: an edit builds a transient PM doc and serializes it back,
// mutating mdast rather than re-deriving it. This round-trip must be lossless — block structure,
// text, marks, and the inline/block MDX atoms survive untouched.

/** Detach an mdast node so the PM atom never shares a mutable reference with the host's tree. */
function cloneNode<T>(node: T): T {
  return structuredClone(node);
}

// ── Blocks ──────────────────────────────────────────────────────────────────
// The doc is a sequence of blocks (paragraph/heading/list/blockquote); each maps to its mdast
// counterpart, and any block the schema doesn't model rides as an `unknownBlock` atom verbatim.

/** Build the editor's block document from a run of mdast blocks. */
export function mdastToDoc(blocks: RootContent[], schema: Schema): ProseMirrorNode {
  const children = blocks.map((b) => blockToPM(b, schema));
  // A doc must hold at least one block; an empty region edits as one empty paragraph.
  return schema.node(
    "doc",
    null,
    children.length > 0 ? children : [schema.node("paragraph")],
  );
}

function blockToPM(node: RootContent, schema: Schema): ProseMirrorNode {
  switch (node.type) {
    case "paragraph":
      return schema.node("paragraph", null, inlineToPM(node.children, schema, []));
    case "heading":
      return schema.node(
        "heading",
        { level: node.depth },
        inlineToPM(node.children, schema, []),
      );
    case "blockquote":
      return schema.node(
        "blockquote",
        null,
        node.children.map((c) => blockToPM(c, schema)),
      );
    case "list":
      return schema.node(
        node.ordered ? "orderedList" : "bulletList",
        node.ordered ? { start: node.start ?? 1 } : null,
        node.children.map((item) => listItemToPM(item, schema)),
      );
    default:
      return schema.node("unknownBlock", { node: cloneNode(node) });
  }
}

function listItemToPM(item: ListItem, schema: Schema): ProseMirrorNode {
  const children = item.children.map((c) => blockToPM(c, schema));
  // A list item must lead with a paragraph (schema `paragraph block*`); a bare nested list with no
  // leading text gets an empty one so the structure stays valid.
  if (children[0]?.type.name !== "paragraph") {
    children.unshift(schema.node("paragraph"));
  }
  return schema.node("listItem", { checked: item.checked ?? null }, children);
}

/** Serialize the editor's block document back to mdast block nodes. */
export function docToMdast(doc: ProseMirrorNode): RootContent[] {
  const out: RootContent[] = [];
  doc.forEach((child) => {
    out.push(pmBlockToMdast(child));
  });
  return out;
}

function pmBlockToMdast(node: ProseMirrorNode): RootContent {
  switch (node.type.name) {
    case "paragraph":
      return { type: "paragraph", children: inlineFromNode(node) } satisfies Paragraph;
    case "heading":
      return {
        type: "heading",
        depth: node.attrs.level as Heading["depth"],
        children: inlineFromNode(node),
      } satisfies Heading;
    case "blockquote":
      return {
        type: "blockquote",
        children: blockChildren(node) as Blockquote["children"],
      } satisfies Blockquote;
    case "bulletList":
      return {
        type: "list",
        ordered: false,
        spread: false,
        children: listItems(node),
      } satisfies List;
    case "orderedList":
      return {
        type: "list",
        ordered: true,
        start: node.attrs.start as number,
        spread: false,
        children: listItems(node),
      } satisfies List;
    case "unknownBlock":
      return cloneNode(node.attrs.node as RootContent);
    default:
      throw new Error(`Unhandled block node in prose doc: ${node.type.name}`);
  }
}

function blockChildren(node: ProseMirrorNode): RootContent[] {
  const out: RootContent[] = [];
  node.forEach((child) => {
    out.push(pmBlockToMdast(child));
  });
  return out;
}

function listItems(node: ProseMirrorNode): ListItem[] {
  const items: ListItem[] = [];
  node.forEach((li) => {
    const checked = li.attrs.checked as boolean | null;
    items.push({
      type: "listItem",
      spread: false,
      ...(checked === null ? {} : { checked }),
      children: blockChildren(li) as ListItem["children"],
    });
  });
  return items;
}

// ── Inline (used inside each block) ───────────────────────────────────────────

/** Compatibility seam: wrap a run of inline content as a one-paragraph document. */
export function mdastInlineToDoc(
  nodes: PhrasingContent[],
  schema: Schema,
): ProseMirrorNode {
  return mdastToDoc([{ type: "paragraph", children: nodes }], schema);
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
        // A soft line break inside a paragraph is a literal "\n" in the mdast text; markdown and the
        // published page collapse it to a space (white-space: normal). The editor renders with
        // pre-wrap, which would instead honor it as a hard break and reflow the text mid-edit — so
        // collapse soft breaks here, and the editor wraps exactly like the page (preview == publish).
        const value = node.value.replace(/[^\S\n]*\n[^\S\n]*/g, " ");
        // PM forbids empty text nodes; an empty mdast text carries nothing to preserve.
        if (value.length > 0) out.push(schema.text(value, marks));
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
      case "delete":
        out.push(
          ...inlineToPM(
            node.children,
            schema,
            requireMark(schema, "strikethrough").create().addToSet(marks),
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

// PM stores a node's marks as an unordered set; re-nest them deterministically in schema order
// (link ⊃ emphasis ⊃ strong) to match remark's own inline nesting. The `code` mark turns a text
// leaf into an `inlineCode` node rather than wrapping it (mdast models inline code as a leaf).
function inlineFromNode(node: ProseMirrorNode): PhrasingContent[] {
  const codeMark = requireMark(node.type.schema, "code");
  const items: InlineItem[] = [];
  node.forEach((child) => {
    const hasCode = codeMark.isInSet(child.marks) != null;
    const marks = child.marks.filter((m) => m.type !== codeMark);
    items.push({ marks, leaf: leafFor(child, hasCode) });
  });
  return nest(items, 0);
}

/** Compatibility seam: read the inline content of a one-paragraph document. */
export function docToMdastInline(doc: ProseMirrorNode): PhrasingContent[] {
  const first = doc.firstChild;
  return first ? inlineFromNode(first) : [];
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
    case "strikethrough":
      return { type: "delete", children };
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
