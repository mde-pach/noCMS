# Spike: rendering Astro in the browser

Proves the noCMS editor can render real `.astro` sections client-side, with islands from
any framework, producing output byte-identical to a real `astro build`.

Verified against **Astro 7.2.8** on 2026-08-27.

```
npm install
npm run build:render   # the editor's render bundle  (SSR build, browser-runnable)
npm run build:client   # island client assets for hydration
npm run test:hydrate   # React + Vue + Svelte hydrate and respond to clicks
npm run test:parity    # diff browser output vs. a real astro build
npm run bench          # re-render timing
```

## Results

| Check | Result |
|---|---|
| `astro/container` bundled for browser | no `node:` imports; runs in Chromium |
| Real `.astro` (frontmatter, props, expressions) | renders client-side |
| React + Vue + Svelte islands in one section | all three SSR |
| Hydration in an iframe | all three interactive |
| Parity vs. `astro build` | **byte-identical** (1023 = 1023 chars) |
| Re-render | p50 0.20 ms, p95 1.9 ms |
| Editor render bundle | 1174 kB raw, unminified, 3 frameworks |

## Compiling for parity — the exact recipe

Astro 7 compiles with **`@astrojs/compiler-rs`** (Rust), not the Go/WASM `@astrojs/compiler`.
Use the same package and the same options as `astro/dist/core/compile/compile.js`, or scoped
style hashes diverge:

```js
transform(source, {
  filename,
  normalizedFilename: normalizeFilename(filename, root), // <- drives the scope hash
  internalURL: 'astro/compiler-runtime',
  scopedStyleStrategy: 'attribute',                      // default; raw compiler uses 'where'
  resultScopedSlot: true,
  compact: compressHTML,
})
```

With the wrong options a section scoped `data-astro-cid-qsrilpog` in the build came out as
`:where(.astro-hndbj5yh)` in the editor — different hash *and* different strategy. With the
right ones both emit `data-astro-cid-qsrilpog` and the markup is identical.

The compiler returns a `css` array. The emitted module imports
`<file>?astro&type=style&index=N&lang.css`; resolve it to a virtual id that does **not** end
in `.css` (or vite's CSS pipeline claims it) and register the text for the editor to inject
into the iframe.

## The five things that make it work

1. **Build the editor bundle as an SSR build** (`build.ssr` + `ssr.noExternal: true`), not a
   client build. This is the load-bearing trick: every framework plugin then emits SSR
   codegen exactly as Astro's own server build does. Without it Vue silently fails its
   `check()` (no `ssrRender`) and Svelte emits DOM code that crashes.
2. **Stub the integrations' virtual modules** — `astro:react:opts`, `astro:vue:opts`,
   `astro:svelte:opts`, `virtual:astro:vue-app`. Normally injected by the integrations.
3. **Alias `react-dom/server` → `react-dom/server.browser`**, and shim `node:async_hooks`
   (~10 lines, Svelte 5 needs it).
4. **Give React `include: ['**/*.jsx','**/*.tsx']`.** Its `check()` is greedy and throws on
   foreign object components; this is the same fix real multi-framework Astro configs use.
5. **Rewrite island URLs before mounting.** The container emits raw specifiers
   (`component-url`, `renderer-url`, `before-hydration-url`); map them to built asset URLs.

## Known deltas vs. a real build

Two, both deterministic and accounted for:

- `compressHTML` — the build strips inter-tag whitespace, the container does not.
- `before-hydration-url` — the container emits it, the build omitted it here.

## Why the canvas must be an iframe

`iframe-test.html` / `iframe-test2.html` render the same section three ways, in a 375px-wide
canvas, inside a 1400px browser window:

| | media query | `min-height:100vh` | `position:fixed` |
|---|---|---|---|
| same document, 375px box | **did not fire** (sees 1400px) | 916px (wrong) | 1400px wide (escapes) |
| Shadow DOM, 375px host | **did not fire** | 900px (wrong) | — |
| **iframe, 375px** | fired | 316px | 375px |

An iframe is the only construct that creates a real viewport. Without one, the editor and the
published page disagree visually even when the HTML is byte-identical — so the iframe is what
delivers the §5 guarantee, not a compromise against it. Shadow DOM isolates styles but not the
viewport, so it is not an alternative.

Two things make it cheap:

- **The drag never crosses the boundary.** The overlay lives in the parent and covers the
  iframe, so the parent receives every pointer event. It hit-tests with
  `iframe.contentDocument.elementFromPoint(x - rect.left, y - rect.top + scrollY)` — verified
  working, same-origin via `srcdoc`. No `postMessage`, no drag-and-drop API across frames.
- **Never rewrite `srcdoc`.** Mount once, then patch the DOM inside. Measured: a DOM patch
  preserves live island state; a `srcdoc` rewrite destroys it along with scroll and focus.
  Morph the changed section's subtree (idiomorph/morphdom) instead.

## Page format: `.astro` round-trips losslessly

`roundtrip2.mjs` parses a page to an editor tree and writes it back:

- **identity round-trip is byte-identical** — open a page, change nothing, save nothing changes
- frontmatter (imports, comments, logic) preserved verbatim
- attribute `kind` separates `quoted` (editable) from `expression` (read-only, "set in code")
- slot nesting survives, because Astro already expresses it

The trap: a tree that only models components **silently drops text and expression children**
(`<p>© {year}</p>` became `<p />`). The tree must be lossless over the whole file — anything
the editor does not understand is carried verbatim.

## Editing text: morph, but not under the caret

`caret.html` / `caret.mjs`. Morphing the section while the user types resets the caret to
offset 0 whenever the re-rendered text differs from the DOM. Guarding fixes it:

```js
morphdom(el, html, { onBeforeElUpdated: (from) =>
  !(from.contains(doc.activeElement) && from.hasAttribute('contenteditable')) })
```

Siblings still update. Never rewrite `srcdoc`.

## The build-only boundary

`astro:assets` and `astro:content` do not resolve outside Astro's build. The build emits
`<img src="/_astro/photo.5vcyeoBI_y2VBm.webp" loading="lazy" decoding="async" …>` — a
content-hashed, format-converted URL the editor cannot compute.

So: **anything build-only needs a build-exported manifest that an editor shim reads.** One
pattern covers images and collections. Newly added items show a local placeholder until the
next publish.

## Cost

Minified, three frameworks (React + Vue + Svelte) plus the container:
**507 kB raw / 166 kB gzip / 126 kB brotli.**

## Caveat

`experimental_AstroContainer` is still experimental in Astro 7 and has broken on a minor
before (5.14.8 → 5.15). Pin Astro, and gate publishes on a parity check.
