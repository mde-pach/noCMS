# Spec — Onboarding (Phase 0)

The make-or-break flow: a non-developer goes from *"I want a website"* to *a live, editable,
published site* — without seeing a config file, and **learning what GitHub is, in plain terms,
along the way**. Education is not a tooltip afterthought here; it *is* the feature. Grounded in
the resolved decisions in `VISION.md` (decision 3) and the existing `auth` / `github` / `session`
/ `build` seams.

> **North star:** the moment of magic is "*that's my site, and I just clicked something and it
> changed.*" Everything before it is overhead to be minimized and *explained*, never hidden in a
> way that leaves the user unable to run their own site later.

## Where onboarding runs (and why it's decentralization-safe)

Before the user has a repo, there is no site to host the wizard — so onboarding runs on a
**stateless bootstrap launcher**: a static page (served from the noCMS project's own Pages, or
self-hostable / forkable) that holds *no data* and only orchestrates GitHub API calls **with the
user's own token, in their browser**.

This does not violate decentralization (invariant #2), for the same reason the relay doesn't: the
launcher is a *one-time bootstrap tool*, optional and replaceable — a developer can skip it and
create the repo by hand. Nothing the finished site does at runtime depends on it. It is strictly
more benign than the relay (it isn't even in the auth-secret path; it just makes client-side API
calls). The created site is fully self-contained afterward (D1).

**Launcher ≠ relay (don't conflate them when registering the App).** The GitHub App's *Callback
URL* is the **launcher page** — where GitHub redirects the user with `?code=…`. The **relay** is a
separate stateless API (`POST /exchange`, `POST /refresh`) the launcher then calls to swap that code
for a token (the one step that can't run in-browser; see `apps/relay`). The relay host does **not**
go in the Callback URL field; the launcher URL does, and the `redirect_uri` the launcher sends to
`/exchange` must match it exactly. Both hosts are a deployment decision (deferred).

## The journey

Six steps. Each names **what happens**, the **plain-language teaching** (the brick it introduces),
and the **UX intent**. Steps 1–4 are mechanical and should feel like one continuous "setting up
your site…", not four separate chores.

**0 — Welcome / "Create your site."**
*What:* landing on the launcher; a one-line promise and a single primary button. Detect whether the
user has a GitHub account; if not, explain and link to GitHub signup first.
*Teaching:* "Your website will live on **GitHub** — a free, reliable home for its files, run by a
company millions of developers trust. You'll own it completely." (Set the frame: GitHub = free
hosting you own, not a noCMS account.)
*UX:* one button, no form. Honesty about the ~2-minute one-time setup.

**1 — Sign in to GitHub.**
*What:* a **GitHub App** install+authorize that collapses to **one screen** via "Request user
authorization (OAuth) during installation" (research-confirmed); the relay does only the
code↔token exchange. App permissions: Administration R/W (create repo), Contents R/W (commits),
Pages R/W (enable Pages), Actions R (poll the build), Metadata R (forced). PAT is the power-user
fallback. **Steer the install to "All repositories"** — a template-generated repo is *not* auto-added
to a "selected repositories" install (research finding; the edge path is a `PUT` add-call).
*Teaching:* "You're giving noCMS permission to create and update **your** site on GitHub — and
nothing else. The key it uses expires on its own and never leaves your browser." (Plain-language
version of invariants #7/#8: short-lived rotating token, client-side only.)
*UX:* the standard GitHub consent screen, pre-framed so it isn't scary. On return, the launcher
holds the session in memory only.

**2 — Name your site → create the repository.**
*What:* one text field (site name → repo name, slug-validated, availability-checked live). On
submit, create the repo **from the starter template** (`POST /repos/{template}/generate`), not a
fork — an independent repo with clean history (recommended; see Decisions).
*Teaching:* "We're making your site's **home folder** (GitHub calls it a *repository*). It's just a
folder GitHub keeps safe — every change is saved forever, so you can undo anything, anytime."
*UX:* name + live-validated slug; a friendly retry if the name is taken.

**3 — Turn on the web address.**
*What:* one `POST /repos/{owner}/{repo}/pages {build_type:"workflow"}` to create the `github-pages`
environment (research-confirmed: owning the deploy workflow does *not* auto-enable Pages), then the
template-shipped `actions/deploy-pages` workflow does the deploys. The address is
`https://<user>.github.io/<repo>/` for v1 (custom domains deferred — `VISION.md`). The launcher
writes this address as `siteUrl` into `nocms.config.json` at creation, so derive's sitemap and
feeds aren't silently dark (Phase 6 / D3 gate those on `siteUrl`).
*Teaching:* "GitHub can show your folder to the world as a real website — for free. We're switching
that on. Your address is **<user>.github.io/<name>**."
*UX:* automatic; surfaced as "reserving your web address…", not a settings toggle the user hunts for.

**4 — First build.**
*What:* the publish Action runs (`@nocms/build` → SSG → Pages). First run has real latency (~1–2
min). **Do not block editing on it** — see Instant gratification below.
*Teaching:* "GitHub is **assembling** your site for the public web — like a printer warming up the
first time. You don't have to wait; you can start editing right now."
*UX:* a calm progress state with a live "open my live site" link that activates when the build lands.

**5 — Land in the editor (first-run).**
*What:* hand off to the editor. Because reads are client-side from `api.github.com` (invariant #7),
the editor boots against the new repo's content **immediately**, even before the first Pages deploy
finishes.
*Teaching:* a 3-beat coach-mark pass, each teaching one action: "Click any text to edit it" (L0) →
"Press **+** to add a section" (L1) → "Hit **Publish** when you're happy" (Phase 5). No upfront
tour; teach at the point of action.
*UX:* the authoring shell (`docs/specs/authoring-shell.md`) with first-run coach marks that
dismiss permanently after one pass.

## Instant gratification: edit before the build finishes

The first Pages build is the longest wait, and waiting kills the magic moment. Because the editor
renders live in-browser from the repo content via the API (invariant #1 + #7), step 5 starts
*concurrently* with step 4: the user is clicking and editing their real site while Pages builds in
the background. The "open my live site" link is the only thing gated on the build. This turns the
one unavoidable latency into a non-event.

## The education model

- **Brick glossary, in plain terms** — introduced just-in-time, one per step, never as a wall of
  docs:

  | GitHub term | What we call it | One-line frame |
  |---|---|---|
  | Repository | your site's home folder | a safe, versioned folder GitHub keeps for you |
  | Commit | a saved version | every change is saved forever; undo anything |
  | Branch | a safe draft copy | edit without touching the live site |
  | Pages | your web address | GitHub showing your folder to the world, free |
  | Actions | the assembler | what builds your site for the public web |
  | Token | the key | short-lived, stays in your browser, you can revoke it |

- **Just-in-time, not upfront.** No glossary screen; each term appears the first time it's relevant,
  in one sentence, with "learn more" optional.
- **Teach toward self-sufficiency.** The framing always leaves the door open to "you could do this
  yourself on GitHub" — because the whole point is the user *owns* the site, not rents it.

## Edge & failure handling

- **No GitHub account** → detect, explain ("GitHub is free — make an account, then come back"),
  deep-link to signup, resume after.
- **Permission denied at consent** → explain exactly what each permission is for, offer retry; offer
  the PAT fallback for the wary.
- **Repo name taken / invalid** → live validation before submit; friendly inline retry.
- **Pages enable fails / not permitted** → fall back to the template's Actions-based Pages source;
  surface a plain-language "we couldn't turn on your web address" with a one-click retry.
- **Build fails or is slow** → editing already works (instant gratification), so this is degraded,
  not broken; show honest status + retry, never a dead end.
- **Token expires mid-session** → silent refresh (`@nocms/auth` rotating refresh); re-consent only
  if the refresh token is gone.

## Decisions (see D10)

1. **Repo creation → template-generate** (`/generate`), not fork: independent repo, clean history,
   no upstream coupling — matches D1. `templates/starter` is marked a template repository. ✅
2. **Identity → a GitHub App** (verdict confirmed, `docs/research/github-app-onboarding.md`):
   `/generate` works with a user-to-server PKCE token; creation is authorized by Administration R/W
   at account level; install+authorize is one screen; all endpoints are CORS-enabled. Permissions:
   Administration R/W, Contents R/W, Pages R/W, Actions R, Metadata R. Fine-grained PAT stays the
   zero-relay fallback. *Two residual empirical checks before shipping (owner): the "selected vs all
   repositories" install behaviour, and `build_type:"workflow"` on a brand-new repo.* ✅🔬
3. **Pages → the template ships the deploy workflow** (`actions/deploy-pages`, source = "GitHub
   Actions"); no separate enable call in the live flow — fewer permissions, one less failure point. ✅

## Open questions → Claude Design exploration targets

- The **one-button welcome** + how much to promise vs explain on screen 0.
- The **continuous "setting up your site…"** sequence (steps 1–4) — making four API calls feel like
  one calm progress flow, not a checklist.
- The **brick-teaching** treatment — one plain sentence per step without it reading as childish or
  cluttering the flow.
- The **first-run coach marks** in the editor — three beats, dismiss-after-one-pass.
- The **build-wait** state that invites editing instead of waiting.

## Relationship to existing seams

- `@nocms/auth` — PKCE sign-in, PAT fallback, rotating-token lifecycle (steps 1, edge cases).
- `@nocms/github` — the API client for `/generate`, Pages enable, first content reads (steps 2–5).
- `@nocms/session` — opens the first editing session over the new repo (step 5 onward).
- `@nocms/build` — the first publish Action (step 4); the publish loop is specced in Phase 5.
- `templates/starter` — the template repo that's generated; ships the editor + vendored `@nocms/*`
  bundles (D1) and (pending decision 3) the Pages deploy workflow.
