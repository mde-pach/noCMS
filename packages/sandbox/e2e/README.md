# Browser E2E — the physical iframe boundary

The unit tests prove the protocol and capability logic over an injected `MessagePort`. This
harness proves the parts only a real browser can: the `load`→port-handoff across a real
sandboxed iframe, capability enforcement across the frame boundary, real CSP network denial,
and null-origin DOM isolation.

## Run it

```sh
bun run e2e            # bundles the package + serves http://localhost:4321/
```

Open the URL in any browser (or drive it with Playwright). `host.html` loads `guest.html` into
a sandboxed frame via `loadPlugin`, granting **only** `content:read` of the three the manifest
requests. The guest speaks the wire protocol by hand (no package import — proving the protocol
is plain), runs its checks, and posts findings to `window.__E2E`.

## Verified result (real Chromium)

```json
{
  "granted": ["content:read"],
  "hasParentDom": false,
  "read": { "pages": 3, "token_is_here": false },
  "tokensError": "capability-denied",
  "network": "blocked",
  "tokenLeaked": false
}
```

- `granted` — effective grant is owner-approval ∩ manifest-request (manifest asked for
  `content:read`, `tokens:contribute`, `network`; owner approved only `content:read`).
- `read` — the granted call round-tripped through the real iframe + transferred port.
- `tokensError: capability-denied` — the ungranted call was refused across the boundary; the
  host method was never reached.
- `network: blocked` — `fetch` was blocked by the frame CSP. The browser logs the matching
  `connect-src 'none'` violation from `about:srcdoc`, confirming the guest ran in the
  null-origin srcdoc frame.
- `hasParentDom: false` / `tokenLeaked: false` — the guest cannot reach the host DOM, and the
  token never crosses into the guest.
