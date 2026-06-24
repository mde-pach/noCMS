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

handle.destroy(); // tear down the view
```

Also exported for host use / testing: `mdastInlineToDoc`, `docToMdastInline`, `proseSchema`.

The widget is framework-agnostic — the host mounts it into its own DOM element. Side effects
(DOM, ProseMirror view) live only in `mountProseEditor`; the transformer and schema are pure
and unit-test without a DOM.

## Marks & nodes supported

`text`, `strong`, `emphasis`, `inlineCode`, `link` (href + optional title), `break`, plus the
two inline MDX atoms above. Any inline construct that cannot be preserved is recorded as a
caveat in `DECISIONS.md` (D2a) — never silently dropped.
