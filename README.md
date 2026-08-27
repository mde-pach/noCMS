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

### Components are the unit

There is no privileged "section" type. A page is components composed into components;
what the library panel calls a section is just a component that stands alone on a page.
Any component the editor can resolve is addressable — selectable, editable, draggable —
and **a component needs no noCMS metadata to be usable**. A descriptor adds a typed prop
panel; it never decides whether a component may be used. That is what makes an imported
library reachable rather than something you first have to describe.

Where things may go is decided by a three-word vocabulary rather than per-component
allow-lists, so a new library needs no new rules:

| role | means | example |
|---|---|---|
| `block` | stands alone on a page | Hero, Pricing |
| `inline` | goes inside things | Button, Badge |
| `container` | has slots that take others | Nav, Columns |

`inline` is the default, so an undescribed component is droppable into things without
being assumed to work as a page element.

### Using an external component library

`nocms.config.mjs` is the whole contract. The build already handles libraries — that is
Astro's job. What this declares is how the **editor** reproduces the same environment,
so the canvas and the published page cannot disagree:

```js
export default {
  renderers: ["react"],                                   // frameworks in use
  components: ["src/components/**/*.{astro,tsx,vue,svelte}"],
  styles: ["src/styles/theme.css", "src/styles/app.css"], // reach page AND canvas
  tokens: { "--primary": "var(--brand)" },                // re-theming reaches the library
};
```

Each library fills a different subset, which is the test of whether the contract is
really library-agnostic:

| | arrives as | framework | fills |
|---|---|---|---|
| shadcn | source copied into your repo | React | renderers + styles + tokens |
| daisyUI | npm Tailwind plugin | **none** | styles + tokens |
| HyperUI | pasted markup | none | nothing |

Both a React component and a framework-free one are exercised in
`tests/components.e2e.mjs`, side by side inside the same container, with one token change
re-theming both.

Two things this had to get right, both of which failed silently first:

- **Global CSS never reaches the editor by accident.** An SSR build strips CSS imports, so
  a library's stylesheet would be absent from the canvas while the built page looked
  correct. `styles` inlines it; a missing file fails the build rather than the canvas.
- **The whole tree renders in one container pass.** Rendering components separately and
  concatenating the strings loses slot content for framework components — a React
  component needs `children`, not an HTML string — so `<Button>Docs</Button>` rendered
  empty in the editor and correct on the site. The parity gate caught it.

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

### The editor is built from the same kind of component set

`editor/ui` is the editor's own copy of a shadcn-shaped component set — Button, Field,
Input, Select, Tabs, Dialog — and the chrome is built from it. That is a forcing
function: if the editor cannot be built from components of this shape, neither can a
user's site, and we find out immediately rather than through a bug report.

One rule keeps it honest: **the editor never imports from `src/components`**. If it did,
deleting a component would break the editor you need in order to fix it — and the editor
is served from the site it edits, so that failure would be unrecoverable. A test asserts
it.

The chrome and the canvas are different documents, so they share component *shapes*
while using different token scopes: the owner setting `--brand` to hot pink turns their
site pink and leaves the editor alone. A test asserts the chrome reads no site tokens.

### Search, and what a static host can honestly do

Search is built with Pagefind: the index is produced from the published HTML at build
time and queried in the visitor's browser. No server, no API key, no per-query cost,
nothing to operate. The editor route is excluded from the index.

That is the honest shape of §8.1 generally — build-time and client-side are free;
anything that reacts to a visitor needs an endpoint the owner chooses to add.

### Onboarding

Three concepts cannot be hidden, because the owner will meet their names elsewhere:
**an account, a folder for the site, and an address**. Everything else — branches,
commits, Actions, tokens-as-a-concept — stays behind product language, and no SHA is
ever shown. A test asserts the onboarding copy contains no tool vocabulary, so that
cannot rot quietly.

A repository that is not set up yet gets the teaching path rather than an error.

## Status

The thin slice: three sections, one page, one theme, and the loop working end to end.

- **Local mode** — verified in a real browser (`bun run test:e2e`, 23 checks): boot,
  render, select, panel edit, inline edit, add section with its import, publish to the
  working tree.
- **GitHub mode** — verified against a real repository (`bun run test:github`): read,
  missing-file, byte-identical write-back, and one commit per publish so it is a single
  revertable step. Runs on a scratch branch and deletes it.
- **Parity gate** — green: the editor's browser render matches `astro build`.

Not yet done: enabling Pages via the API on a freshly created repository — it needs a
token with rights this machine's does not have, so it is unverified rather than unwritten.
