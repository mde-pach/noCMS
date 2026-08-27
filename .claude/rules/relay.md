---
paths:
  - "apps/relay/**"
---

# Auth relay rules

The relay is the *only* infra noCMS runs, and it exists for one reason: GitHub has not enabled
CORS on its OAuth token endpoint, and the client secret is still required at redemption — so the
`code → token` exchange cannot run in the browser. The relay does that exchange and nothing more.

- **Stateless.** Hold no session, no database, no per-user state. A request comes in, the
  exchange happens, the response goes out, everything is forgotten. If a change needs to persist
  state, it does not belong in the relay.
- **Minimal surface.** Two operations only: exchange an authorization code for a token, and
  refresh a token. Do not add content endpoints, proxying of `api.github.com`, or convenience
  routes — all GitHub reads/writes happen client-side, not here.
- **Never log or echo secrets.** No tokens, codes, client secret, or refresh tokens in logs,
  error messages, or responses beyond what the caller strictly needs.
- **Replaceable by design.** An owner must be able to self-host it or skip it entirely (PAT
  fallback). Don't introduce anything that makes a site depend on a specific hosted instance.
- **Disappears when CORS ships.** When GitHub enables CORS on the token endpoint, the relay is
  deleted, not migrated. Keep it small enough that removing it is trivial.
- Secrets come from the environment (`.dev.vars` locally, never committed); validate inputs with
  valibot.
