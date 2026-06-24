# @nocms/relay

The only infrastructure noCMS runs. GitHub has not enabled CORS on its OAuth token endpoint
and still requires the client secret at redemption, so the browser cannot complete sign-in on
its own. This relay performs that `code → token` exchange (and token refresh) and nothing
more — it holds no session and stores no state.

It is replaceable: an owner can self-host it, or skip it entirely with a fine-grained PAT. When
GitHub ships CORS on the token endpoint, the relay is deleted, not migrated.

## Run

```bash
cp .dev.vars.example .dev.vars   # fill in your GitHub App credentials
bun --env-file=.dev.vars run dev # http://localhost:3000
```

## API

- `POST /exchange` — `{ code, codeVerifier, redirectUri? }` → GitHub token response
- `POST /refresh` — `{ refreshToken }` → refreshed token response
- `GET /health` — `{ ok: true }`

Secrets come only from the environment and never appear in logs or responses. The exchange
logic in `src/github.ts` is decoupled from the HTTP layer so it is unit-tested with a fake
`fetch` (`src/github.test.ts`).
