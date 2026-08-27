# Platform facts (verify before relying)

External GitHub / web-platform facts the architecture leans on. The code can't carry these,
and they drift — re-verify before betting a decision on one.

## GitHub auth & API

- `api.github.com` (REST contents + GraphQL `createCommitOnBranch`) is browser-callable with a
  user token, and PKCE (S256) is supported — so all reads and writes happen client-side.
- **CORS is not enabled on the OAuth token endpoint**, and the client secret is still required
  at redemption, so the `code → token` exchange can't run in the browser. That is the sole
  reason the relay exists; when CORS ships, the relay is deleted, not migrated. See relay.md.
- GitHub App expiring user tokens: access token **8h**, refresh token **6mo**, and the refresh
  token **rotates on every refresh** (single-use). This short blast radius is what makes holding
  a token in the browser acceptable.

## GitHub storage & hosting limits

- File size: 100 MiB hard, 50 MiB warning, ~25 MiB over the API/browser path. Repo < ~1 GB
  ideal. Media is committed to the repo and served from Pages (same origin); **Git LFS is not
  served by the Pages CDN** — no large-media/video story on the free path.
- Actions: **free unlimited for public repos**; 2,000 min/mo on private — so a private repo
  running derive jobs is not zero-cost.
- Pages: ~1 GB site, ~100 GB/mo bandwidth. **Pages ToS forbids sites primarily directed at
  commercial transactions** (e-commerce / checkout); donation and crowdfunding links are fine.
  noCMS targets content / marketing / portfolio / docs sites.

## Rendering

- `preact-render-to-string` runs in both Node and the browser. That universality is what lets
  one renderer serve both the editor preview and the publish prerender (invariant #1).

## Design tokens

- W3C DTCG is a stable interop format; Style Dictionary supports flat output for VCS, and Tokens
  Studio / Penpot consume DTCG. noCMS keeps a flat one-token-per-line source and *generates*
  DTCG for interop, never the reverse (invariant #5).
