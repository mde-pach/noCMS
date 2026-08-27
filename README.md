# noCMS

A visual editor for a website you completely own. The site is plain `.astro` files in
your own repository, hosted free on GitHub Pages. There is no service to sign up for,
pay for, or depend on — including ours.

## The one idea

**The editor ships inside the site it edits.** It lives at `/edit/` on your own domain,
is built by the same run that builds your site, and renders pages with the *same*
component code the build uses. Nothing central to depend on, and no second renderer to
drift.

## Run it

```bash
bun install
bun run dev          # http://localhost:4321/edit/
```

In local mode there is no token and no network: the editor writes straight to your
working tree, so you can edit pages visually while writing sections in your IDE. Vite
reloads as it goes.

```bash
bun run build        # editor + site + parity gate
bun test tests/      # page tree and path guards
bun run test:e2e     # drives the editor in a real browser
bun run verify       # lint + typecheck + tests + build + gate
```

### Biome does not touch `.astro`

Biome only parses `.astro` frontmatter — it cannot see props or components used in the
template below, so it reports every import and prop as unused. Run with `--unsafe` and it
**deletes them**. `.astro` is therefore excluded in `biome.json` and checked by
`astro check` instead. Do not add it back.

`astro check` needs TypeScript 6.x; TypeScript 7's native compiler dropped the
programmatic API it relies on.

## How it fits together

```
src/sections/<id>/index.astro   a section: markup + scoped styles
src/sections/<id>/section.ts    its Zod schema (with UI intent) and metadata
src/layouts/*.astro             editable too — a nav is just a component in one
src/pages/*.astro               pages. The URL is the file path.
src/styles/theme.css            design tokens. Owners edit these values, never rules.
editor/                         the editor: render, canvas, panel
scripts/parity-gate.mjs         proves the editor and the build still agree
```

### Pages are `.astro`

The editor parses a page into a tree, renders the tree, and writes it back. Three kinds
of prop, because the distinction is what makes a visual editor possible without taking
power away from developers:

| In the file | Editor shows | Why |
|---|---|---|
| `title="Hello"` | a text field | plain value |
| `items={[{…}]}` | a data field | a literal, so it is data |
| `year={year}` | read-only, "set in code" | references code |

Detection is purely lexical — nothing is ever evaluated, so a section can never execute
code merely because someone opened the editor.

Nesting is free: `<Columns><Hero slot="left" /></Columns>` is just Astro. A tag is bound
to a section by the page's own `import`, so aliases work exactly as they do in Astro.

**Content is never lost.** A tree that models only components would silently turn
`<p>© {year}</p>` into `<p />`. Everything is modelled, and saving twice changes nothing.
Formatting is normalised on first save; sections are never rewritten by the editor.

### Any component library

A section is an `.astro` file, so it can embed React, Vue, Svelte, Solid or anything else
Astro has a renderer for — in the same page, hydrated, at once. Renderers are registered
from what the installed packs declare (`editor/renderers.mjs`), never hardcoded, so a new
component library is an install rather than a core change.

### Why the canvas is an iframe

Nothing else has a viewport. Rendering a 375px canvas into the editor's own document, in
a 1400px window: media queries never fire, `100vh` resolves to the window, and
`position: fixed` escapes the box. Shadow DOM fails the same way. See
`spikes/container-in-browser`.

The iframe is cheap: same-origin means the overlay lives in the parent and hit-tests with
`elementFromPoint`, so dragging never crosses the boundary. Updates are DOM patches —
rewriting `srcdoc` would destroy island state, scroll and focus — and the node under the
caret is never morphed, or the cursor jumps to the start.

### The pin and the gate

Astro is pinned in `package.json`. The editor renders through `astro/container`, which is
still experimental and has broken on a minor release before. `npm run build` therefore
ends with a **parity gate**: it renders every page through the real editor bundle in a
browser and compares it with what `astro build` produced. A bad bump fails the build
loudly instead of shipping a site that looks different from what the owner was shown.

Getting the compile options wrong is silent and specific — a section scoped
`data-astro-cid-qsrilpog` by the build came out `:where(.astro-hndbj5yh)` in the editor,
so every styled section rendered unstyled. `scripts/astro-plugin.mjs` mirrors Astro's own
call exactly; do not change it casually.

## Status

The thin slice: three sections, one page, one theme, and the loop working end to end.

- **Local mode** — verified in a real browser (`bun run test:e2e`, 23 checks): boot,
  render, select, panel edit, inline edit, add section with its import, publish to the
  working tree.
- **GitHub mode** — verified against a real repository (`bun run test:github`): read,
  missing-file, byte-identical write-back, and one commit per publish so it is a single
  revertable step. Runs on a scratch branch and deletes it.
- **Parity gate** — green: the editor's browser render matches `astro build`.

Not yet done: sign-in through the GitHub App (the relay exists in the current noCMS repo),
and enabling Pages via the API on a freshly created repository.
