# Spike: clickable content anchors for array/object props

Make content rendered from a component's props — including array/object leaves whose
defaults live *in the component* — clickable in the editor, so a click selects the exact
prop input. No content/text matching: provenance is keyed by structure, and the component
stays untouched and agnostic.

## Why `data-mdx-pos` isn't enough

`renderer/editable.ts` already anchors a canvas click to the MDX source offset of the
element it lands on. But a value like `items[2].title` either sits inside a JSX attribute
expression or is a **default set in the component** — which has no MDX source offset at all.
Source-offset provenance can't reach it.

## The mechanism (two halves, clean boundary)

1. **Enumerate** (`@nocms/core` — `enumerateContentPaths(schema, value)`): walk the resolved
   props against `deriveControls`, emitting one dotted path per **display-text** leaf
   (`text`/`textarea`/`richtext`). Arrays expand by the value's actual length, so
   `items.2.title` is its own path. Logic/non-display props (`select`, `number`, `image`)
   are excluded — they're what a component branches on, so we never touch them.

2. **Probe** (`@nocms/renderer` — `probeContentAnchors(render, props, paths)`): substitute
   each path with a unique, transform-stable token, render **once**, and locate each token in
   the output. A token found pins that path to a DOM node — even after `.toUpperCase()` or
   string interpolation. A token that's gone (arithmetic, hashing) reports `found: false` and
   falls back to selecting the parent — never the wrong node.

The token is a plain string (private-use-area framing + index), so the component behaves
**identically** to a real render — it just sees different characters. That's why the
component can stay completely agnostic: we perturb *content*, never *type or shape*.

## Why not value-tagging (branding)?

A hidden tag on the value dies the moment the component transforms it (`` `${x}` `` and
`.toUpperCase()` coerce back to a bare primitive), and an object-wrapper stand-in can betray
a component that does `typeof`/`===`/truthiness on its prop. The probe sidesteps both: it
doesn't keep a tag alive *through* the transform, it locates the output *after* it.

## What's proven

- `core/src/content-paths.test.ts` — array expansion, index keying, logic-prop exclusion,
  absent-optional skipping.
- `renderer/src/content-anchors.test.ts` — pass-through precision, transform survival
  (`toUpperCase`), interpolation (substring), not-found honesty, agnostic-stand-in (identical
  tree), and disambiguation of two identical titles where content-matching is ambiguous.
- `packages/editor/scripts/anchors-demo.ts` — end-to-end on the real `Features` component:
  10/10 leaves enumerated from its schema + defaults, each anchored to its exact tag.
  Run: `bun run packages/editor/scripts/anchors-demo.ts`.

## Layering (pay only for what a leaf needs)

1. Pass-through brand handles the ~90% (text printed as-is) — clickable, cheap.
2. Probe upgrades transformed-text leaves the brand can't reach — one extra hidden render.
3. Parent fallback for the genuinely opaque — component-precise, never wrong.

## Not yet done (next steps to land it)

- Browser side: render the probe into a detached container and walk **text nodes**
  (`TreeWalker`) instead of an HTML string, recording `{ path, node, startOffset }`, then map
  onto the live tree by structural index and wire the click → control selection.
- Structural alignment guard: confirm probe and live trees match (they diverge only when
  control flow depends on content emptiness — a non-empty token avoids the common case).
- Numbers transformed by arithmetic, and content-dependent conditionals, stay parent-only.
