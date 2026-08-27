# Spec — Publish Loop (Phase 5)

The closing surface: how a creator's in-editor changes become a live, public site — and how
they preview, share, and undo along the way. This spec covers **draft → preview → publish →
rollback**, all framed in plain terms (per the onboarding model) and grounded in the real
seams. It assumes D7 (editing-session & content-sync), D2 (mdast/MDX text is the source of
truth), and the authoring shell (`docs/specs/authoring-shell.md`).

> **North star:** publishing feels like *flipping a switch you can always flip back* — edits
> are saved continuously and safely, going live is one calm click, and undoing a publish is as
> ordinary as undoing a typo. The user never sees a branch, a SHA, or a merge — but every one of
> those is doing the work underneath (invariant #3: instant edit, async publish).

## 0. The two states a site is ever in

Only two states exist, and the whole loop is about moving between them:

- **Draft** — the per-session branch (`nocms/session-<clock>`, D7). Everything the editor does
  edits the draft. It is *world-readable* (invariant #9 — there is no private staging), and we
  design around that honestly rather than pretending otherwise (see §2).
- **Live** — what is published to Pages: the static HTML built from the publish-target branch
  (default `main`). This is the address the onboarding flow reserved.

"Publish" is the one operation that moves Draft → Live. Everything else (autosave, preview) keeps
the user safely inside Draft.

## 1. The edit → commit model

The editor accumulates edits on the session branch; the user thinks in *saves*, not commits.

- **Continuous autosave, debounced commits.** Edits mutate the in-memory MDX tree (authoring
  shell). A debounced writer serializes changed entries (`serializeEntry`, or ready `FileChange[]`
  via `stage()`, D7) and commits them with `createCommitOnBranch` (`expectedHeadOid`) on a quiet
  interval (e.g. ~2–5s after the last keystroke, or on blur / structural change). The user never
  presses "save."
- **What a "commit" means to a non-dev:** nothing — it is invisible. If surfaced at all, it is a
  quiet "All changes saved" indicator (the brick is *commit → a saved version*, onboarding's
  glossary). The history of commits is the *substrate* for "what changed" (§6) and rollback (§5),
  not something the user manages.
- **Optimistic, with honest recovery.** The indicator shows *Saving… / Saved / Couldn't save*.
  On a stale-head throw (`expectedHeadOid` mismatch — another tab/device advanced the branch,
  D7's deferred case) the editor refetches head and retries the commit; if content genuinely
  diverged it surfaces "this site was edited somewhere else" rather than silently clobbering.
- **One model, so undo is uniform.** In-editor undo (authoring shell's tree-transform stack) is
  the *fast* local undo; published rollback (§5) is the *durable* one. They are different scopes,
  and the UI keeps them distinct: Cmd-Z is "undo my last edit," rollback is "go back to a version
  I published."

## 2. Draft vs live (and the honesty invariant #9 demands)

Everything edits the draft branch; only Publish touches live. Because the draft branch is public
(invariant #9), we do **not** market drafts as "private." Instead:

- The editor's framing is "**unpublished changes**," never "private draft." The plain-language
  promise is accurate: *unpublished changes aren't on your public address yet* — not *nobody can
  see them.*
- A draft is reachable only by someone who knows the branch/SHA (it is not linked from the live
  site, not in the sitemap, not indexed). That is "unlisted," and we say exactly that if asked.
- This is a feature, not an apology: the same public-readability is precisely what makes the
  shareable preview (§3) work with **no auth and no second deployment**.

## 3. Preview

Two tiers, both reusing the *one* renderer (invariant #1), so preview === publish holds.

**a) In-place preview — free.** The editor already renders the live tree; "preview" is just the
canvas with chrome hidden (a Preview toggle that strips selection outlines, tags, and inserters).
No build, no network beyond what the editor already loaded. This is the default, instant preview.

**b) Shareable preview — render-at-SHA (VISION decision 4).** To show a draft to someone *else*
without publishing:

- The share link carries `owner/repo@sha` (the session branch's current head commit). A small
  **preview-runtime** (the renderer + content loader, no editor) boots at a stable route
  (e.g. `…/__preview/?ref=<sha>`), fetches the content tree at that SHA from the **public**
  `api.github.com` (invariant #7 — reads are client-side; a public repo needs no token), and
  renders the identical tree the editor shows.
- **No second deployment, no branch proliferation:** the session branch already keeps that SHA
  reachable (D7), so GitHub will not garbage-collect it; the preview is "the live renderer pointed
  at a different git tree." When the session branch is deleted after publish (D7 cleanup), old
  preview links for that SHA stop resolving — acceptable, and worth stating in the share UI
  ("this link works until you publish or close the editor").
- **Honest caveat — rate limits.** Unauthenticated GitHub reads are ~60 requests/hour/IP. A
  preview that fetches a whole content tree can spend several requests per load, so wide/public
  sharing will throttle. Preview is *for a handful of reviewers*, and the share UI should say so
  rather than imply it scales to an audience. (A signed-in reviewer, or a preview that inlines a
  prebuilt content snapshot at share time, are documented escalations — not built in v1.)

## 4. One-click publish

Publish is Draft → Live: **merge the session branch into the publish target; the push is the
trigger** (D7). It is asynchronous (invariant #3) and the UI never blocks the editor on it.

1. **Confirm with "what changed" (§6).** The Publish button opens a human diff, not a raw git
   diff: "3 pages changed — Home, Pricing, About." Confirm.
2. **Merge.** `publish()` does the `/merges` REST merge into `base.branch` (e.g. `main`); pushing
   to that branch fires the **template-shipped** Pages/Actions deploy workflow (D10 decision 3 —
   no `workflow_dispatch`, no `actions` scope, the most decentralized trigger per D7).
3. **Build runs async.** `@nocms/build` prerenders the *same* tree to static HTML + islands and
   deploys to Pages. The editor shows calm progress ("Publishing… your changes are going live")
   with a link that activates when the deploy lands. The user keeps editing meanwhile — new edits
   start a fresh draft on the (recreated) session branch.
4. **Cleanup.** On a successful merge the session ref is deleted best-effort (D7); a failed delete
   is swallowed (the content already published; a stray public branch is cosmetic per invariant #9).

**Failure handling, in plain language:**
- **Merge conflict (`/merges` 409, D7's deferred case).** Happens when the live branch advanced
  underneath the draft (a second editor, a hand edit on GitHub). Framed as "*your site changed
  somewhere else while you were editing*," with the v1 resolution being **rebase-the-draft**:
  refetch the publish target, replay the draft's commits onto it, re-diff, and re-offer Publish.
  *Open question (below): the automatic-merge-vs-always-ask policy.*
- **Stale head on the final commit** before merge → §1's retry path.
- **Protected default branch** (direct merge blocked) → D7's documented escalation
  (`workflow_dispatch` or PR-then-merge). Flagged, not built; surfaced as "this site requires
  review before publishing" if encountered.
- **Build/deploy fails** → live stays on the last good version (publish is atomic from the user's
  view — a failed build does not half-publish); show honest status + retry. Never a dead end.

## 5. Rollback — "undo a publish"

Reverting a publish is free: git history *is* the version list. The non-dev never sees git.

- **Surface:** a "**Version history**" list of past *published* versions — one row per publish,
  with a timestamp, the "what changed" summary captured at publish time (§6), and a thumbnail.
  These map to commits on the publish target, but are labelled "Published [date] — changed Home,
  Pricing," never by SHA.
- **Restore:** "Restore this version" creates a **new** commit on the publish target whose tree
  matches the chosen past version (a forward revert, not a history rewrite — safe, and itself
  undoable). The push re-triggers the deploy exactly like a normal publish. Rolling back is just
  publishing an older tree.
- **Plain framing:** "*Put my site back to how it was on [date].*" Because restore is itself a
  publish, you can always roll the rollback forward again — there is no destructive, unrecoverable
  action anywhere in the loop.
- **Preview before restore:** a Restore offers the §3 shareable/in-place preview of that past SHA
  first, so the user *sees* what they're reverting to before it goes live.

## 6. "What changed" — a human diff, not a git diff

Both the publish confirm (§4) and the version history (§5) show changes in the user's vocabulary:

- **Page-level first:** "3 pages changed — Home (edited), Pricing (edited), Team (new)." Derived by
  diffing the entry set between two trees (which content files added/removed/modified), mapped to
  page titles/routes — not filenames.
- **Section-level on expand:** within a changed page, which sections were added, removed, reordered,
  or edited — computed by diffing the mdast/MDX trees (D2), so it speaks in components ("added a
  Pricing section," "edited the Hero heading"), never in `+`/`-` text lines.
- **Never a raw unified diff** in the default view (it is available at L4 "edit as MDX" for devs,
  but invisible to non-devs). The human diff is the contract; the git diff is the substrate.

## 7. Anti-patterns to avoid

1. **An explicit "Save" button** — autosave is the model; a Save button implies edits can be lost.
2. **Calling drafts "private"** — false under invariant #9; erodes trust the first time someone
   finds a draft URL. Say "unpublished / unlisted," accurately.
3. **Blocking the editor on the publish build** — violates invariant #3; publish is async, the
   canvas stays editable.
4. **Surfacing SHAs, branches, or merges** to non-devs — the substrate must stay invisible.
5. **Raw `+`/`-` git diffs** as the change summary — speak in pages and sections (§6).
6. **A second preview deployment / branch-per-preview** — render-at-SHA needs neither (§3).
7. **Destructive rollback** (history rewrite / force-push) — restore-forward only, always undoable.
8. **Silent clobber on stale head / conflict** — surface "edited elsewhere," never overwrite blind.
9. **Implying shareable preview scales to an audience** — it is reviewer-scale; say so (rate limit).

## 8. Open questions → Claude Design exploration targets

- The **publish confirm** dialog: how the §6 human diff reads at a glance (page list + expandable
  section changes) without becoming a wall.
- The **"Publishing…" async state**: progress that reassures without blocking; what the activated
  "view live" moment feels like.
- **Version history** browsing: timeline density, thumbnails, the Restore → preview → confirm flow.
- The **"unpublished changes"** indicator + share-preview affordance: communicating *unlisted, not
  private* honestly without alarming the user.
- **Conflict resolution → RESOLVED (D13): ask only on same-section overlap.** Auto-rebase and
  publish when draft and live touched different sections; prompt the user only when the same section
  diverged. (The remaining open part is purely the *prompt UX* for that same-section case — a Claude
  Design target.)

## 9. Relationship to existing seams

- `@nocms/session` — the spine: `open` (branch-per-session) · `stage`/`commit` (autosave, §1) ·
  `publish` (merge → deploy trigger, §4) · best-effort branch cleanup. D7's deferred stale-head /
  conflict cases are exactly §1 and §4's failure paths.
- `@nocms/github` — the browser client under session: `createCommitOnBranch` (`expectedHeadOid`),
  `/merges`, the public-read content fetch the §3 preview-runtime reuses.
- `@nocms/build` — the async publish Action: prerenders the *same* tree (invariant #1) to Pages.
- `@nocms/renderer` — reused verbatim by both the in-place preview and the render-at-SHA preview,
  which is what makes preview === publish true rather than aspirational.
- `@nocms/auth` — the token behind autosave/commit/merge writes; the §3 *shareable* preview needs
  none (public reads).
- `templates/starter` — ships the Pages deploy workflow the merge triggers (D10).
