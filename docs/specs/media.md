# Spec — Media (Phase 4, "media-lite")

How a creator gets images onto a page, and how everything heavier than an image gets *linked*
rather than *hosted*. This is deliberately "media-lite": the repo is the database (invariant #4)
and Pages serves it, so media lives under hard limits — ~25 MiB over the API/browser path, a
~1 GB repo budget, and **no Git-LFS serving on the Pages CDN** (platform-facts). The resolved
stance (VISION decision 2): **images upload with resize-before-commit; video and large files are
embed-by-URL, never uploads.** This spec drives the `Image` and `Embed` components from
`component-library.md`.

> **North star:** dropping an image in feels instant and never asks the user to think about file
> size — because we shrink it *before* it's committed. Anything we can't honestly host (video,
> huge files) is a paste-a-link, not a broken upload.

## 1. Image upload flow

Pick a file (drag-drop onto the canvas, the `Image` control's picker, or paste) → **resize and
re-encode client-side, before any commit** → commit the bytes via `@nocms/github`.

1. **Decode + guard.** `createImageBitmap(file)` to decode off the main thread. Before decoding,
   refuse absurd inputs (e.g. > ~40 MiB source, or non-image MIME) with a plain-language message
   ("That image is too big to add — try a smaller one"), so we never OOM the browser. SVG takes a
   separate path (§5, security).
2. **Resize + re-encode.** Draw to a canvas scaled so the longest edge ≤ a sensible max (default
   **2048 px**), then `canvas.toBlob('image/webp', ~0.82)`. WebP is universally served by Pages and
   cuts bytes dramatically; EXIF/orientation is normalized during the draw and metadata is dropped.
   The result is almost always a few hundred KB — comfortably under the 25 MiB API path, so the
   limit is a guardrail users never feel.
3. **Content-hash naming + dedup.** Hash the re-encoded bytes (SHA-256) → `assets/<hash>.webp`. If
   that path already exists in the tree (`listTree`), **skip the commit and just reference it** —
   re-using the same image across pages costs zero extra bytes, and the hash-in-name makes assets
   immutable and far-future cacheable.
4. **Commit.** A single `FileChange { path: 'assets/<hash>.webp', contents: <base64>, encoding:
   'base64' }` on the session branch (`@nocms/github` already supports the base64 path). The
   `Image` node's `src` prop is set to the repo-relative path.

**Instant preview vs committed path (the preview===publish nuance for media).** A freshly uploaded
image isn't on Pages yet (it lives only on the session branch). So the editor previews it from an
in-memory **object URL** immediately, while the stored prop is the repo path; an
already-committed-but-unpublished image resolves via the public contents API (everything is public,
invariant #9). Once published, the path resolves at the site origin. The user sees the image
instantly either way.

**Where media lives.** `assets/` at the repo root is the canonical user-media directory; the build
(§4) is responsible for getting it into the published output. (`public/`-style passthrough vs an
optimized rewrite is a build-wiring detail — see open questions.)

## 2. The media library / browser

Reuse beats re-upload. The library browses everything already in `assets/`:

- **Listing** comes from `listTree` filtered to `assets/`; thumbnails load via the public raw/contents
  path. No separate media database — the git tree *is* the index (invariant #4).
- **Pick-existing vs upload-new** are one surface: search/scan the grid, or drop a new file (which
  runs §1, and dedup means re-dropping an existing image just selects it).
- **Alt text is per-use, not per-asset.** The same photo can be decorative in one place and
  meaningful in another, so alt lives on the `Image` *node's* `alt` prop (set in the props panel),
  not in shared asset metadata. The picker nudges for alt at insert time (accessibility), but never
  blocks.

## 3. Embed-by-URL (video, maps, large files)

The `Embed` component is how everything we can't host gets onto a page: paste a URL → detect the
**kind** (YouTube/Vimeo → video, a maps URL → map, otherwise a generic link/iframe) → render a
**lightweight click-to-load facade** (a thumbnail + play button that only loads the heavy
third-party iframe on click — faster, and privacy-friendlier). `kind` is also overridable in the
props panel when detection is wrong.

This is the honest answer to "no large-media story on the free path": video bytes never touch the
repo or Pages bandwidth; the host (YouTube/Vimeo/etc.) serves them. For users who truly need
self-hosted video, that's a self-host concern (consistent with decision 2), not the free path.

## 4. Image optimization is tier ③, not runtime (invariant #6)

The runtime upload does the **minimum safe** transform — one reasonable-sized WebP — so editing
stays instant and in-browser. **Heavier optimization is precomputed at publish** in `@nocms/build`
(tier ③): generating responsive `srcset` widths and rewriting `Image` output to serve the right
size per viewport. The editor never does this; it would be wasted work on every keystroke. Tier
discipline: the runtime ships one good-enough asset; the build turns it into a responsive set once,
at publish.

## 5. Progressive disclosure

Media is almost entirely L0/L1 — a non-developer's daily action:

| Altitude | Media action | Trigger |
|---|---|---|
| **L0 Content** | Swap an image, paste a video URL, edit alt text | Click the image / `Embed` |
| **L1 Compose** | Insert an `Image`/`Gallery`/`Embed`, pick from the library | Insert palette |
| **L2 Design** | Image `fit`/aspect via token-bound controls | Props panel |
| **L3 Structure** | — (media has no structural layer) | — |
| **L4 Extend** | Reference `assets/…` directly in raw MDX | "Edit as MDX" |

## Anti-patterns to avoid

1. **Committing originals.** Always resize-before-commit; a 12 MP phone photo must never enter the
   repo at full size.
2. **Uploading video or huge files.** No LFS on Pages; that's what `Embed` is for.
3. **A separate media database / manifest.** The git tree is the index; don't invent a second one.
4. **Per-asset alt text.** Alt is contextual — it belongs to the usage, not the file.
5. **Eager third-party iframes.** Use click-to-load facades; don't tank load time with autoplaying
   embeds.
6. **Doing responsive/`srcset` work at runtime.** That's tier ③ build, precomputed once.
7. **Trusting raw SVG.** SVG is markup that can carry script — sanitize or treat as a restricted
   path (§ open questions), never commit untrusted SVG as-is.

## Open questions → Claude Design exploration targets

- **Orphaned-asset cleanup.** Images committed then unreferenced still sit in `assets/` (and, via git
  history, in repo bytes forever). A `@nocms/derive` ② job could *flag* unreferenced assets; actual
  deletion is destructive and history retains the bytes regardless — real tension with the ~1 GB
  budget. Decide flag-only vs a "clean up" action.
- **Very large libraries vs the ~1 GB repo budget.** A media-heavy site eventually outgrows the free
  path; the escalation is external hosting / self-host (decision 2). Where's the warning threshold,
  and how is it surfaced kindly?
- **`assets/` build wiring.** Static passthrough (`public/`-style) vs an optimized rewrite in the
  build output — and how `Image` `src` paths resolve identically in preview, on the session branch,
  and after publish.
- **SVG policy → RESOLVED (D13).** `.svg` uploads are allowed but sanitized by DOMPurify (MIT,
  browser-side, SVG profile: strip `<script>`/`<foreignObject>`/`on*`/external refs) before commit —
  never a hand-rolled sanitizer.
- **Upload UX** — the drop-resize-commit micro-interaction, the library grid density, the alt-text
  nudge that helps without nagging (prime Claude Design exploration).

## Relationship to existing seams

- `@nocms/github` — `FileChange` (base64) + `commit` for upload; `listTree` for the library index.
- `@nocms/components` — the `Image` and `Embed` components this spec drives (`component-library.md`).
- `@nocms/build` — tier ③ responsive/`srcset` optimization at publish (`prerender`/`vite-plugins`).
- `@nocms/editor` — the upload control, drop target, and media-library browser surfaces.
- `@nocms/renderer` — renders `Image`/`Embed`; the `Embed` facade hydrates as an island, `Image`
  stays static.
