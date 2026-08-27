# Spec — Site Settings & Lifecycle

The "manage my site" surface: the handful of site-wide settings and the account/lifecycle controls
that sit *outside* page-by-page editing. This is L3/L4 territory a non-developer rarely opens, yet
it must be calm, honest, and one click away. Grounded in `@nocms/core`'s `site-config.ts` (D8),
`@nocms/auth` (D10 GitHub App + PAT fallback), and `@nocms/github`; it assumes Phase 3
(`design-theming.md`) and Phase 2 (`structure.md`) own the surfaces it merely *links to*.

> **North star:** there is almost nothing to "configure," because noCMS stores nothing. Settings is
> a friendly face over two things the user already owns — a small `nocms.config.json` in their repo
> (invariant #4) and their GitHub account (invariant #7). Every setting is either a line of text in
> their repo or a fact about their GitHub — never state on a noCMS server (invariant #2).

## 0. Anatomy

A **Settings** view, reached from the editor's account/site menu — not a tab in the per-page rail.
Six panels, in decreasing frequency of use:

- **Site** — title, description, favicon, address.
- **Design** — active theme + dark-mode default (entry point only; Phase 3 owns the editing).
- **Collections** — define/edit structured content types (entry point only; Phase 2 owns it).
- **Account** — GitHub identity, sign-in method, session, switch site.
- **Domain** — the site's web address; custom domains deferred.
- **Danger zone** — visibility, export, delete — all framed as *your GitHub repo*.

Nothing here blocks editing; a non-dev may set the site title once at the start and never return.

## 1. Site metadata

The flat, machine-read site facts — small, rarely edited, legitimately JSON (invariant #5 scopes
text-not-JSON to *layout and tokens*, not config). Stored in `nocms.config.json` (D8, valibot):

- **Title** & **description** — the site's name and one-line summary; feed default `<title>`/meta and
  the social-card fallbacks (Phase 6 derives per-page overrides from these).
- **Favicon** — pick an image via the Phase 4 media picker; committed like any asset.
- **`siteUrl`** — the published address. **Auto-set at onboarding** (the launcher writes the
  `github.io` URL into config, per onboarding §3) so derive's sitemap/feeds are never silently dark
  (D3 gates them on `siteUrl`); editable here when a custom domain lands.

Each field edit is one commit to `nocms.config.json` on the session branch (D7), framed in plain
language ("Site name"), never as "edit config."

## 2. Theme & design entry point

A thin entry, not a second design surface: pick the **active theme preset** and the **dark-mode
default** (follow system / light / dark). Selecting a preset writes the token values Phase 3 defines;
the actual token editing lives in the tokens panel (`design-theming.md`, D12). Settings only records
*which* theme is active — it does not re-spec theming.

## 3. Collections management entry

The entry point to **define a collection** (a power-user, L3 act) — links into the Structure tab's
collection schema editor (`structure.md` §4). Definitions live in `nocms.config.json` (D11);
each field is a `FieldDef`, and entry forms reuse the D9 schema→control mapper. Settings surfaces the
list of collections and a "new collection" affordance; it delegates the editing. A non-dev never
opens this.

## 4. Account & session

The honest face of decentralized auth (invariants #2, #7):

- **Identity** — the signed-in GitHub user (avatar, handle), read from the token's scope. noCMS holds
  no account of its own; *you sign into GitHub, not into noCMS.*
- **Sign-in method** — GitHub App (default) or fine-grained PAT (zero-relay fallback), shown plainly
  so the user knows which they're on (D10).
- **Session / token status** — "Signed in · access renews automatically" in plain language; the
  rotating short-lived token (8h access / 6mo refresh, platform-facts) refreshes silently via
  `@nocms/auth`. Surface a re-sign-in prompt only when the refresh token is gone, never raw expiry.
- **Sign out** — drops the in-memory session (nothing persisted server-side to revoke); link to
  GitHub's app-settings page to *revoke access entirely*, reinforcing that the user is in control.
- **Switch site** — the user may own several noCMS repos; switching re-points the editor at another
  repo via the GitHub client. (Multi-site listing/switching UX is an open question.)

## 5. Custom domain (deferred)

For v1 the address is `https://<user>.github.io/<repo>/`, explained in plain terms ("your free web
address, hosted by GitHub"). Custom domains are **deferred** (VISION.md): the panel shows the current
address and a clearly-marked "custom domains coming later" placeholder, with no half-built CNAME flow.
When built, it sets the Pages custom domain + writes `CNAME`, and `siteUrl` (§1) updates to match.

## 6. Danger zone / lifecycle

The site **is** the user's GitHub repository — lifecycle actions are framed as such, reinforcing "you
own this, not us" (invariant #2):

- **Visibility** — the free path is public (invariant #9): content, drafts, and history are
  world-readable. Settings states this honestly and never implies a private/staging option exists on
  the free path. (A self-hosted/private setup is a separate story, not a toggle here.)
- **Export** — there is nothing to export: it is *already* a git repo the user fully owns. Settings
  says exactly that and links to "download / clone on GitHub." No lock-in, by construction.
- **Delete** — deletion happens **on GitHub** (it's their repo); Settings explains this and deep-links
  to the repo's delete page rather than pretending noCMS owns the data. We never destructively act on
  the user's repo from a settings toggle.

## 7. Progressive disclosure

| Altitude | In Settings | Trigger to reach it |
|---|---|---|
| **L0 Content** | Set site title / description / favicon | "Site" panel — three plain fields |
| **L1 Compose** | (none — Settings is not the canvas) | — |
| **L2 Design** | Pick active theme / dark-mode default | "Design" panel → tokens panel for editing |
| **L3 Structure** | Define a collection; manage the address | "Collections" / "Domain" panels |
| **L4 Extend** | Edit `nocms.config.json` directly; revoke token on GitHub | "Edit config" / GitHub app settings |

A non-dev touches only the "Site" panel, once. Everything deeper is summoned, never in the way.

## Anti-patterns to avoid

1. **Inventing noCMS accounts/state** — there is no noCMS account; settings reflect the repo + GitHub
   only (invariant #2). Never store user state server-side.
2. **Implying private/staging on the free path** — everything is public (invariant #9); say so.
3. **A delete button that acts on the repo** — deletion is GitHub's; deep-link, don't proxy a
   destructive action.
4. **Re-speccing design/collections here** — Settings links to Phase 2/3 surfaces; it doesn't fork
   them.
5. **Raw token/expiry jargon** — surface "signed in, renews automatically," not OAuth mechanics.
6. **Config-as-JSON-blob editing** as the default — plain labelled fields; raw `nocms.config.json` is
   the L4 escape hatch only.

## Open questions → Claude Design exploration targets

- **Multi-site switching UX** — how a user with several noCMS repos lists and switches between them
  (the GitHub client can enumerate owned repos; the affordance is undesigned).
- **Where favicon / asset-ish settings live** — in the Site panel vs the media library; and whether
  favicon generation (sizes) is worth any tier-③ work or stays a single uploaded image.
- **Sign-in-method clarity** — making the GitHub-App-vs-PAT distinction legible without scaring a
  non-dev (most never see it).
- *Prototype in Claude Design:* the **Settings shell** (six calm panels), the **account/session**
  card (honest, non-alarming token status), and the **danger zone** framing that teaches ownership
  instead of threatening data loss.

## Relationship to existing seams

- `@nocms/core` — `site-config.ts` (D8) holds title/description/`siteUrl`/collection defs; the schema
  is valibot-validated.
- `@nocms/auth` — the GitHub App / PAT session, rotating-token lifecycle, sign-out (D10).
- `@nocms/github` — reads the signed-in identity and enumerates owned repos for switching; writes
  config commits on the session branch.
- `@nocms/editor` — hosts the Settings view off the account/site menu; links into the tokens panel
  (Phase 3) and Structure tab (Phase 2).
- `@nocms/session` — every settings change is a commit on the session branch (D7), published like any
  other change (Phase 5).
