# noCMS — Vision & Architecture

> **Status:** Vision / source of truth. Self-contained — everything needed to start the cowork
> session is here. This is a **vision document, not a development plan**: it states the *what*
> and *why* and the firm product/architecture decisions, and it **defers implementation details
> to development** (they're listed explicitly in §13, not pre-decided).
>
> **Proto name:** noCMS — *no* = no central system to maintain, no end-user cost, no rebuild the
> editor waits on, no lock-in. noCMS is **open source and free for everyone**: no marketplace, no
> monetization, no commercial service.

---

## 1. What noCMS is

**A decentralized, git-backed CMS that lets someone build and manage a real website for free on
GitHub — edited in-site, published with one click, with nothing centralized for anyone to
maintain.**

The repo is the database. GitHub's own subsystems (git, the API, Actions, Pages) are the
backend. Each site is self-contained and self-hosted on the owner's GitHub; noCMS is software
people adopt, not a service they depend on.

---

## 2. Principles

1. **Decentralized — nothing central to maintain.** Each site is fully self-contained: the
   editor ships **with the site** (per-site, not a hosted studio), content lives in the owner's
   repo, publishing runs in the owner's GitHub Actions. The project operates **no central system
   a site depends on**. The single optional shared convenience is a **stateless auth relay**, and
   even that is **BYO-first** and replaceable (a site can self-host it or fall back to a token) —
   so nothing the project runs can break a site.

2. **End user: click-and-click, zero *added* cost.** The owner signs in ("Sign in with GitHub")
   and edits — no token to paste, nothing to provision, no bill beyond a GitHub account. Readers
   just read. (This is *not* a "no infra" claim — GitHub is infra; the point is no end-user
   friction and no end-user cost.)

3. **Stateless / no-maintenance wins ties.** Whenever a choice is between something that holds
   state or needs operating and something that doesn't, the stateless option wins, even at some
   cost in convenience or security. Less to run = less to break.

4. **Instant editing; one-click asynchronous publishing — one rendering engine.** Editing and
   preview render at runtime in the browser — instant, no build. **Design-token / theme changes
   are runtime (CSS variables) and never rebuild.** Publishing is a discrete **"Publish changes"**
   action that commits and triggers an optimized build + deploy **asynchronously** — the editor
   never waits on a build. The build prerenders with the *same* renderer the editor previews with,
   so preview and published output cannot diverge (§10).

5. **The repo is the database; GitHub is the backend.** Versioned storage = git history.
   Compute = Actions. Hosting = Pages. We compose these rather than rebuild them.

---

## 3. Non-goals

- **Not** a hosted SaaS or a centralized studio. No central app a site depends on.
- **Not** a commercial product. noCMS is open source, free, available to everyone; nothing is
  sold. Plugins/extensions are an extensibility mechanism, not a revenue surface.
- **Not** multi-tenant or anonymous-editing. The editor is the **repo owner**, authenticated as
  themselves.
- **Not** a system that requires the adopter to provision or pay for third-party infra (no
  per-site Netlify/Cloudflare/Vercel — they meter usage).
- **Not** real-time multi-editor collaboration (would need a P2P/CRDT layer — future, §13).
- **Not** an IDE. Authoring is content + visual layout, not code editing.

---

## 4. Architecture at a glance

### 4.1 The four planes
| Plane | What it does | Where it runs |
|---|---|---|
| **Read** | render content at runtime in the browser | reader's browser + GitHub Pages / CDN |
| **Write** | in-site edits → commits to the owner's repo | owner's browser → `api.github.com` |
| **Derive** | precompute features from content (search, i18n bundles, manifests…) | owner's GitHub Actions |
| **Publish** | build + deploy the public site | owner's GitHub Actions → GitHub Pages |

Nothing in the read/write path is a server the project runs. The only optional shared piece is
the stateless auth relay (§6).

### 4.2 The tier model (where computation can run)
Any transformation lands in one of three placements, decided by two physical axes — does it need
the *whole corpus* or *this page*, and must it happen *before paint* or *in the browser*:

- **① Client (view-time, in-browser):** markdown/MDX render, client routing, **live token
  theming via CSS vars**. No build, no server.
- **② Batch (ahead-of-time, in Actions):** anything that's a function of the whole corpus and
  tolerant of staleness — search index, i18n bundles, content manifest, taxonomies, feeds. Output
  is just more files, served like content.
- **③ Build/Publish (per "Publish changes"):** SEO-ready static HTML, image optimization,
  MDX-at-build. The HTML is produced by prerendering the same Preact component tree the editor
  renders live (`preact-render-to-string`), then hydrated as islands — not a second component
  model. Runs async so the editor never waits.

**Design discipline: push work *down* a tier.** Precompute in ② what naïvely looks like it needs
③; serve from ① whatever ② produced. This is the core cleverness, applied repeatedly — search
(§11) is one example of it, not a special case.

---

## 5. How it works, end to end

- **Read:** the site renders content from the repo (runtime in-browser for the editor preview;
  pre-built static HTML for the published public site — **same renderer, two execution moments**).
- **Edit:** the owner opens the in-site editor (shipped with the site), signs in with GitHub, and
  edits content + visual layout + theme. Edits are instant (runtime preview). Each editing
  session works on its **own branch** (D-branch).
- **Publish:** **"Publish changes"** merges the session branch to `main`, which triggers an
  Actions build (Vite + Preact SSG, §10) + deploy to GitHub Pages — asynchronously.
- **Derive:** Actions also precompute derived artifacts (search, i18n, manifests, feeds) committed
  back as files the site reads (kept off session branches to avoid merge noise — §14).

---

## 6. Authentication (decentralized, click-and-click)

The editor is the repo owner, so the write credential is the owner's own GitHub identity, obtained
client-side. The model is "as safe as possible with **no infra beyond a stateless relay**."

- **Default: "Sign in with GitHub" (GitHub App) with PKCE.** No token to create or paste. The
  flow uses **PKCE** (S256) so an intercepted authorization code is useless to anyone else.
- **Why a relay still exists.** GitHub supports PKCE but has not yet enabled CORS on the OAuth
  token endpoint, and still requires the client secret at redemption. So the `code → token`
  exchange cannot run from the browser; **one stateless relay** performs only that exchange (and
  refresh), holds no session, and forgets. This is the only infra — exactly "proxying, nothing
  more." When GitHub ships SPA/CORS support for the token endpoint, the relay disappears entirely.
- **Short-lived, rotating credentials.** Use a **GitHub App with expiring user tokens**: the
  **user access token expires in 8 hours**; the **refresh token in 6 months** and **rotates on
  every refresh**. A stolen token is useful for hours, not forever — a far smaller blast radius
  than a long-lived PAT.
- **The token never reaches plugin/extension code.** All third-party plugin code runs in a
  **sandbox** (§17) with no access to the credential, host DOM, or network by default. The token
  lives only in the host/auth context. This is what makes the browser-token model acceptable.
- **Fallback: fine-grained PAT.** For zero dependency on any relay, the owner can paste a
  repo-scoped fine-grained token instead.
- **Multi-repo:** one sign-in manages every repo where the App is installed; the editor lists
  them.

> **Key fact:** only the OAuth token-*exchange* endpoint lacks CORS. `api.github.com` (REST
> contents, GraphQL `createCommitOnBranch`) is browser-callable with a token — so all reads and
> writes happen client-side; the relay touches only the exchange.

---

## 7. Content

- **Format: MDX** — Markdown plus components from the library (§9). Content is *trusted*
  single-owner content.
- **Structured collections** organize content (e.g. posts, pages) with typed fields driving the
  editor and derive jobs. *(The exact schema mechanism is an implementation detail — §13.)*
- **Media:** images committed to the repo, **optimized at publish-build** (responsive sizes,
  AVIF/WebP, placeholders), and **served from GitHub Pages** (same origin — no third-party host).
  Repo-stored media accepts GitHub's limits (~20–25 MB/file, repo ideally < 1 GB); no external
  bucket in v1. The editor surfaces these limits visually (§14) so the owner sees headroom before
  hitting a wall.

---

## 8. Editing experience

- **In-site, per-site editor.** Ships with the site (decentralized); never a hosted studio, never
  a redirect to GitHub.
- **Instant runtime preview.** Edits render immediately in the browser (runtime MDX), so the
  editor never waits on a build. Heavy compilation for preview is loaded **only in the editor**
  (WASM), never shipped to readers.
- **Branch per session.** Each session edits on its own branch; **"Publish changes"** merges to
  `main`. Per-session preview comes free from the branch.
- **Versatile content editing** via a WYSIWYG editor over MDX. *(Specific editor library is an
  implementation detail — §13; the bar is lossless round-tripping of content.)*

---

## 9. Layout & theming

The high-value surface: compose pages visually from a component library, and theme them live.

- **Two git-line-mergeable documents — no JSON for layout or tokens.**
  - **Layout = MDX/JSX**, not a JSON tree. Component instances are JSX tags with props/slots, so
    the layout is *text*: it diffs and merges line-by-line like code, instead of producing the
    unresolvable structural conflicts a JSON layout tree would (§14). Layout and content live
    together in MDX (embed), or as a thin `.jsx` layout that references content collections.
  - **Tokens = a flat, line-oriented token file** (one token per line, CSS-custom-property-shaped),
    used directly as the source of truth. One-token-per-line means clean git line merges. **W3C
    DTCG is the interop format** — nested DTCG is generated from the flat source at build for
    tooling (Style Dictionary, Tokens Studio, Penpot), not the reverse.
- **Component library, integrated by props-discovery.** Components are integrated by **parsing
  their TypeScript types** to auto-derive the editor controls (no hand-written config, no
  annotation layer): the *type* determines the control (`string`→text, literal-union→select,
  `ReactNode`→slot, handler→a CMS **action-binding** picker). Richer controls come from richer
  *types*, not annotations. noCMS bridges parsed-types and any explicit field-config into one
  schema; a thin optional field-config is the escape hatch for defaults, help text, grouping, and
  validation types can't express. *Note: this integrates the curated/plugin components — not
  end-user authoring of arbitrary components, which is out of scope.*
- **Runtime token theming.** Tokens compile to **CSS variables**, so editing a token restyles
  instantly in the browser with **no rebuild** — the feature best-aligned with the whole
  architecture. The token editor covers the **full token set** (color, type, spacing, radius,
  shadow, border, breakpoints, …), not a reduced subset.
- **Responsive editing** via **breakpoints** (per-breakpoint prop overrides).
- **Visual editing** reuses the runtime renderer as the canvas (sandboxed as needed).
- **Plugin system for themes & templates.** Themes/templates (and component packs) are delivered
  as **plugins/extensions**, run in the **sandbox of §17**. Onboarding lets the owner pick one.
  This is the extensibility model.

---

## 10. Publishing

- **Trigger:** "Publish changes" → merge session branch → `main`.
- **One rendering engine, two moments.** The editor previews by rendering the MDX→**Preact**
  component tree live in the browser. The publish build prerenders the **identical** tree to
  static HTML with **`preact-render-to-string`**, then hydrates interactive parts as **islands**
  (`preact-iso` / `@preact/preset-vite` prerender). Because there is only one component model and
  one renderer, **what you preview is what you publish** — the single biggest correctness property
  of the system.
- **Build:** **Vite + Preact SSG** in **GitHub Actions**, asynchronously. Build plugins provide
  **image optimization** (sharp / vite-imagetools), **MDX** (`@mdx-js/rollup`), **sitemap/RSS**,
  and SEO/first-paint. (Astro is not used as the renderer: its component model would be a *second*
  renderer distinct from the in-browser Preact preview, which is exactly the drift this design
  eliminates.)
- **Deploy:** **GitHub Pages.** No third-party host.
- **Latency, honestly:** the build step is fast, but the CI pipeline (runner start, install,
  deploy) dominates wall-clock — realistic publish is tens of seconds, hidden behind the async
  model, not "instant." Public repos get free unlimited Actions.

---

## 11. Derived features (the build/derive tier in action)

The ② tier is a general capability for anything precomputable from content. Examples (tools are
implementation details, chosen in development):

- **Search.** A CI-built, sharded index fetched on demand — the canonical "precompute in ②, serve
  from ①" example. *(Raised as the illustrative case for why a build step is worthwhile; the tool
  and even the approach are open — §13.)*
- **i18n / multilingual.** In scope. Translation bundles/derived per-locale outputs are a natural
  ② artifact.
- **Version history + restore.** In scope. Git already holds the history; noCMS surfaces a
  version timeline and one-click restore (diffs computed semantically from content, not raw git
  text — and, since layout/tokens are text too (§9), diffs are legible).
- **Manifests, taxonomies, feeds (RSS).** Cheap ② artifacts the site reads at runtime. Committed
  to a path/branch kept **off session branches** to avoid merge conflicts with editing sessions.

---

## 12. Hosting & cost model

- **Sites:** GitHub Pages (host) + GitHub Actions (build/derive) + the repo (storage). Zero cost
  to the owner.
- **Zero-cost requires a *public* repo** — and noCMS is open source, so public is the norm anyway.
  The owner must understand the consequence plainly: **everything in the repo is world-readable** —
  published content, *drafts*, session branches, and full edit history. There is no private
  staging on the free path. The editor states this at onboarding so it is never a surprise.
- **Private-repo note:** a private repo keeps drafts hidden but caps Actions at **2,000 min/mo**;
  a frequently-publishing site running derive jobs can exhaust that. Private = not zero-cost.
- **Editor:** ships per-site (decentralized).
- **Auth:** stateless relay, BYO or optional-shared; no site depends on it.
- **Net:** the owner pays nothing beyond a GitHub account (public repo); the project maintains
  nothing a site depends on.

---

## 13. Decisions, deferrals, scope

### Decided (product / architecture)
- Decentralized, per-site editor; no central studio; nothing central a site depends on. Open
  source, free, no marketplace/monetization.
- Click-and-click auth: GitHub App + **PKCE**, **expiring user tokens (8h) + rotating refresh
  (6mo)**, via a **stateless exchange/refresh relay** (required until token-endpoint CORS ships);
  token **isolated from plugin code** (§17); PAT fallback; multi-repo.
- Content = **MDX** + structured collections; media in repo, optimized at build and served from
  Pages, **limits shown in the editor** (§14).
- Instant runtime preview + **one-click async publish**; **branch per session**.
- Publish via **Vite + Preact single-renderer SSG** (`preact-render-to-string` + island
  hydration) → **GitHub Pages**, built in **Actions**. *The editor's renderer IS the build
  renderer.*
- Runtime **CSS-variable token theming**, **full token set**; **breakpoint** responsive editing.
- Layout = **MDX/JSX** (text, line-mergeable); tokens = **flat one-per-line file**
  (CSS-var-shaped) as source of truth, nested **DTCG generated for interop**. **No JSON for
  layout or tokens.** Layout and content are coupled by **embed-in-MDX**.
- Component integration via **TypeScript props-discovery** (no annotation DSL; type→control;
  handlers→action-bindings); bridges explicit field-config.
- **Plugin/extension system** for themes/templates (and component packs), run in the **§17
  sandbox**.
- Renderer family: **Preact** (fits MDX + lightweight runtime); **lightest** client router;
  **WASM** preview compiler loaded **only** in the editor.
- **Monorepo**; **MIT** license.
- In scope: **i18n**, **version history + restore**.

### Deferred to development (implementation details — decide while building, not now)
- Content schema mechanism + any runtime validation approach.
- URL/routing model.
- Primitive UI library — criterion: **lightest, most versatile, most optimized**.
- Styling/token engine — driven by the primitive-lib choice; must read the flat token source (§9).
- WYSIWYG/MDX editor library — bar: lossless content round-trip.
- Specific tools for search and other ② features (e.g. index library) — and whether the chosen
  approach is even the best; revisit per feature.
- Branch lifecycle details (naming, cleanup, conflict handling) — incl. keeping derive artifacts
  off session branches (§11).
- Exact Vite plugin set for image-opt / sitemap / MDX.
- Sandbox engine choice for §17 (iframe + QuickJS-in-WASM vs. iframe-only).

### Out of scope (v1)
- Real-time multi-editor collaboration — needs a P2P/CRDT layer; revisit later.
- End-user authoring of arbitrary custom components (compose from the library/plugins instead).
- Syntax highlighting as a special concern — if code blocks appear, the build pipeline handles it;
  not an engine-level decision.
- Commerce / checkout on noCMS sites — GitHub Pages forbids it (§14); content sites only.

### Open research (worth exploring in cowork, no commitment)
- Best build/derive approaches per feature (search, i18n, restore) — the ② toolbox.
- When GitHub ships CORS on the token endpoint, drop the auth relay entirely (§6).

---

## 14. Honest constraints & limits

- **SEO / first paint** come from the publish build (static HTML); the runtime preview is
  owner-only and needn't be indexed.
- **Media is bounded by GitHub limits** (~20–25 MB/file, repo < ~1 GB); no large-media/video story
  in v1 (Git LFS isn't served by the CDN). **The editor makes this visible:** a usage indicator
  shows repo-size and per-file headroom, warns as the owner nears the limit, and blocks oversized
  uploads with a clear message — surfaced *before* it bites, not discovered at publish.
- **Publish latency** is CI-pipeline-bound (tens of seconds), hidden by async publish, not
  eliminated.
- **No ad-hoc relational/per-viewer queries** at read time — precompute known shapes in ②;
  per-viewer logic is out of the zero-cost envelope.
- **Everything is public** on the free (public-repo) path — drafts and history included; the editor
  says so at onboarding (§12).
- **Concurrency:** branch-per-session can conflict if two sessions edit at once (rare for a single
  owner); because layout/tokens are text (not JSON), conflicts are *line-level and resolvable*
  rather than structural. Derive artifacts are kept off session branches (§11).
- **A global change** (shared component, nav, baked theme) can force a near-full rebuild; keep
  tokens runtime to avoid that for the most common global change.
- **Adopter footnote (not a noCMS feature):** an adopter cannot run an e-commerce/checkout site on
  GitHub Pages — its ToS forbids sites "primarily directed at facilitating commercial
  transactions." Donation/crowdfunding links are allowed. noCMS targets content / marketing /
  portfolio / docs sites.

---

## 15. Prior art (what to learn from; where noCMS differs)

- **Decap / Sveltia / Keystatic / Pages CMS** — git-backed editors, but rebuild-on-change and
  (mostly) a hosted/OAuth-proxy dependency. noCMS keeps editing instant (runtime preview) and the
  publish async.
- **TinaCMS** — git-backed with a runtime content API, but needs a DB index. noCMS uses git +
  build, no DB.
- **Puck** (MIT) — JSON layout + component registry; strong reference for the layout *model*, but
  noCMS stores layout as **MDX/JSX text** (not JSON) for git-mergeability (§9/§14).
- **W3C DTCG + Style Dictionary** — the token interop format + tokens→CSS-vars pipeline; noCMS
  keeps a **flat source** and generates DTCG for interop (§9).
- **WordPress Global Styles / theme.json** — proof the "blocks + visual global-theme editor"
  model scales; reference for the token-editor UX.
- **giscus** — the "self-host or use a shared instance, both from one open-source codebase" model
  for the auth relay.
- **Pagefind** — static, sharded, CI-built search; the canonical ②-tier example.
- **preact-render-to-string / preact-iso / @preact/preset-vite** — the single-renderer SSG +
  island-hydration basis for §10.
- **Figma plugin system (sandboxed iframe + QuickJS-in-WASM)** — the reference for the §17 plugin
  sandbox: untrusted plugin code reaches the host only through whitelisted, capability-scoped APIs.

**noCMS' niche:** a fully **decentralized**, per-site, git-backed CMS with **instant runtime
editing + runtime token theming + one-click async publish from a single rendering engine**, **no
central system to maintain**, and **zero added end-user cost** — a combination none of the above
ships.

---

## 16. Verified platform facts (re-verify before relying)

- **OAuth/CORS:** `api.github.com` (REST + GraphQL `createCommitOnBranch`) **is** browser-callable
  with a token. **PKCE is supported** but **CORS on the OAuth token endpoint is not**, and the
  client secret is still required at redemption → a stateless exchange relay remains necessary
  (§6). When this is fixed, the relay can be removed.
- **GitHub App expiring user tokens:** user access token **expires in 8 hours**; refresh token
  **expires in 6 months** and **rotates on refresh**. Opt-in; recommended for security.
- **GitHub file limits:** 100 MiB hard, 50 MiB warning, ~25 MiB via API/browser; repo < 1 GB
  ideal. Media is served from GitHub Pages (same origin); Git LFS is not served by the CDN.
- **Rendering:** `preact-render-to-string` runs in Node and the browser (universal), enabling the
  same renderer at build and in preview; `@preact/preset-vite` does prerender→hydrate. This is the
  basis for the §10 single-engine guarantee.
- **GitHub Actions:** free **unlimited for public repos** (2,000 min/mo private). GitHub Pages:
  ~1 GB site, ~100 GB/mo bandwidth; **e-commerce/commercial-transaction sites are disallowed**
  (§14).
- **W3C Design Tokens (DTCG):** stable format; tooling — Style Dictionary (supports **flat**
  output for VCS), Tokens Studio, Penpot. noCMS source is flat; DTCG is a generated interop export.
- **Plugin sandboxing:** Figma runs untrusted plugin code in **QuickJS-in-WASM** + a sandboxed
  iframe — the reference model for §17.

---

## 17. Plugin / extension sandbox

Plugins/extensions (themes, templates, component packs) are real code that runs inside the editor,
where the GitHub credential lives. The extension system is therefore specced as a **security
boundary**, not just a loader.

- **Two-context isolation (Figma model).** Plugin **UI** renders in a **sandboxed iframe**
  (separate origin, `sandbox="allow-scripts"`); plugin **logic** runs in an isolated VM
  (**QuickJS-in-WASM**, or iframe-only for v1 — see §13). Neither context has the host DOM, the
  GitHub token, or network access by default. Communication is **`postMessage`** to a narrow host
  API only.
- **Capability-scoped API.** Plugins never touch the raw token or commit directly. They call
  declared host capabilities (register components, read the content model, contribute
  tokens/layout); all repo writes go through the host, which holds the credential (§6). Network
  access is **deny-by-default**, allow-listed per declared permission.
- **Declared permissions + owner consent.** Each plugin ships a manifest declaring the
  capabilities it needs; the owner approves them at install. No silent capability escalation.
- **Versioned + integrity-pinned distribution.** Plugins are referenced by version **and an
  integrity hash** recorded in the site repo, so installs are reproducible and auditable in git;
  updates are explicit, not automatic.
- **Why this matters to auth (§6).** Because plugin code is sandboxed away from the credential, a
  malicious or compromised plugin cannot exfiltrate the token or push to the repo — which is what
  makes the browser-held, short-lived token model acceptable.

---

*End of document. Vision-level source of truth — amend as the vision evolves; leave implementation
choices to development.*
