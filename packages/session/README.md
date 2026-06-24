# @nocms/session

The editing-session backbone. It ties the low-level pieces — `@nocms/auth` (sign-in +
token lifecycle), `@nocms/github` (reads/writes), `@nocms/core` (content vocabulary) — into
one coherent loop:

> **sign in → load repo content → edit → branch-per-session → commit → publish**

Every side effect (the GitHub client, the clock) is injected, so the orchestration unit-tests
with fakes and never touches the network. `src/index.ts` is the whole public API.

## The lifecycle

```ts
import { connectGitHub, openEditingSession } from "@nocms/session";

// 1. Connect a GitHub client from an auth session. The token auto-refreshes and the
//    rotated session is persisted through your store, so a reload resumes signed in.
const client = connectGitHub({
  session,                                   // from @nocms/auth (completeSignIn / fromPat)
  config: { clientId, relayUrl },            // the same AuthConfig used to sign in
  store: {                                   // where the rotated session is persisted
    get: () => loadSession(),                // optional; adopt a session rotated in another tab
    set: (s) => saveSession(s),
  },
});

// 2. Open an editing session over the repo's content. This forks a per-session branch
//    and loads every MDX file matching a collection glob into CollectionEntry[].
const editing = openEditingSession(
  { owner, repo, branch: "main" },
  { client, collections },                   // collections: CollectionDef[] from the site
);
const entries = await editing.open();

// 3. Edit. Stage an edited entry (serialized back to MDX text) or ready FileChange[].
editing.stageEntry({ ...entry, body: "# Edited\n\nNew copy." });

// 4. Commit the staged batch to the session branch (one commit, many files).
await editing.commit("Edit home page");

// 5. Publish: merge the session branch into the publish target, then delete it.
await editing.publish();
```

### How a consumer wires in

- **`@nocms/editor`** today inlines MDX as a dev shim and notes the real path is "load content
  as text from the GitHub API." That path is `connectGitHub` → `openEditingSession().open()` →
  `entries()`; an edit in the shell maps to `stageEntry`/`stage`.
- **A starter "save & publish" button** is `commit(message)` on save and `publish()` on publish.
  Editing and preview stay runtime in the browser; `publish()` is the discrete async step (its
  merge into the default branch is what triggers the Pages/Actions deploy).

## API surface

- `connectGitHub(opts) → GitHubClient` — the auth↔github seam: an auto-refreshing
  `TokenProvider` wired into the GitHub client. Inject `fetch`/`now` to test offline.
- `openEditingSession(base, opts) → EditingSession` — the per-branch orchestration.
  - `open()` → `CollectionEntry[]` — create the session branch, load its content.
  - `entries()` — the loaded entries; `branchRef()` — the working branch ref.
  - `stage(...changes)` / `stageEntry(entry)` — accumulate edits (keyed by path, last wins).
  - `commit(message)` → commit oid, or `null` when nothing is staged.
  - `publish()` — merge into the publish target (defaults to the forked-from branch), then
    best-effort delete the session branch.
- `serializeEntry(entry) → FileChange` — inverse of core's `parseEntry`; the body stays
  verbatim MDX text, only the YAML front-matter is re-emitted.

## Boundaries

`openEditingSession` takes an **injected** `GitHubClient`, so the orchestration is pure over the
client. `connectGitHub` is the only place auth and github meet. The editor's richer body
re-serialization (mdast→MDX) is its own concern — a session that already holds serialized text
uses `stage()` and skips `serializeEntry`.

See `DECISIONS.md` → **D7** for why this lives in its own package, the publish-trigger choice,
branch naming/cleanup, and the deferred sub-decisions.
