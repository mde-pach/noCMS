# @nocms/prose

The in-place **prose editing widget** — a transient rich-text surface for editing the inline
content of a single prose block (a paragraph, a heading) the "click and type like a doc" way.

## The seam (why this package is standalone)

The source of truth for a noCMS site is MDX text / mdast (invariant #5). A lossless
mdast↔MDX-text round-trip lives elsewhere (`parseMdx`/`serializeMdx`). This widget sits one
level down: it edits the **inline content of one block**, so its entire public surface is
**mdast inline nodes** (`PhrasingContent[]`):

- in — a block's inline children (`PhrasingContent[]`)
- out — the edited inline children (`PhrasingContent[]`)

The host (the editor shell) extracts a block's `children`, hands them here, and splices the
result back into the document. Therefore `@nocms/prose` depends only on **mdast types** and
**ProseMirror core** — never on `@nocms/editor`. Clean boundary, no shared state.

## How it works (D2a)

ProseMirror is used as a **transient edit view over mdast**, not as a source of truth (the
inverse of editors that persist ProseMirror JSON). We own a small ProseMirror schema for a
prose span and a **bidirectional, pure transformer**:

- `mdastInlineToDoc(nodes, schema)` — build a ProseMirror doc from mdast inline nodes.
- `docToMdastInline(doc)` — serialize the doc back to mdast inline nodes.

Because we own the schema, the inline **MDX atoms** — `mdxJsxTextElement` (inline `<Badge/>`)
and `mdxTextExpression` (`{expr}`) — are modeled as inline **atom** nodes that carry the
original mdast node verbatim, so they survive an edit deterministically. Generic
markdown↔editor converters drop constructs they don't model; we never do.

## API

```ts
import { mountProseEditor } from "@nocms/prose";

const handle = mountProseEditor(target, {
  nodes,                 // PhrasingContent[] — the block's inline children
  onChange: (nodes) => { // called on every doc-changing edit
    // splice `nodes` back into the document block, re-serialize, re-render
  },
});

handle.view;      // the live ProseMirror EditorView — wire a toolbar / focus to it
handle.destroy(); // tear down the view
```

The view ships with span-scoped undo/redo (`mod-z` / `shift-mod-z` / `mod-y`) and a mark
keymap (`mod-b` strong, `mod-i` emphasis, `` mod-` `` code).

Also exported for host use / testing: `mdastInlineToDoc`, `docToMdastInline`, `proseSchema`.

The widget is framework-agnostic — the host mounts it into its own DOM element. Side effects
(DOM, ProseMirror view) live only in `mountProseEditor`; the transformer and schema are pure
and unit-test without a DOM.

## Marks & nodes supported

`text`, `strong`, `emphasis`, `inlineCode`, `link` (href + optional title), `break`, plus the
two inline MDX atoms above. Any other inline mdast node (e.g. inline `image`, raw `html`) is
carried verbatim as an opaque `unknownInline` atom, so nothing is ever silently dropped.

### Preservation caveats

- **Mark nesting is normalized.** ProseMirror stores a node's marks as an unordered set, so
  the *relative nesting order* of `strong` / `emphasis` / `link` is canonicalized on
  serialize to schema order (link ⊃ emphasis ⊃ strong) — which matches remark's own output
  for the common case (`***x***` → emphasis ⊃ strong). Content authored as the inverse nesting
  (e.g. `**_x_**`, strong ⊃ emphasis) round-trips to the canonical nesting: semantically
  identical, structurally normalized. This is inherent to any mark-based editor.
- **Inline JSX atoms are opaque.** An `mdxJsxTextElement`'s children are not separately
  editable in v1 — the whole element is one verbatim chip. It round-trips exactly; editing its
  contents is a later concern.
