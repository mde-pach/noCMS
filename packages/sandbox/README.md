# @nocms/sandbox

The plugin/extension **security boundary** (invariant #8). Plugin code runs in a sandboxed,
null-origin iframe and reaches the host only through a **capability-scoped postMessage broker**.
A plugin never receives the GitHub token, the host DOM, or — by default — the network.

v1 is **iframe-only**. The browser iframe is the isolation primitive; the host-side broker is
where capabilities are enforced. QuickJS-in-WASM is a documented defense-in-depth escalation
that would layer behind the same broker, not a v1 dependency — see `DECISIONS.md` D4.

The public API is `src/index.ts` — depend on that, not internals.

## The boundary, in two halves

1. **Structural (the frame).** `frameSandboxPolicy(granted)` derives the iframe `sandbox`
   attribute and the guest CSP. The frame is `allow-scripts` **without** `allow-same-origin`, so
   the guest runs in a *null-origin realm*: no access to the host DOM, cookies, or storage, and
   no shared globals. Network is denied structurally — the CSP carries `connect-src 'none'`
   unless the `network` capability was granted, so `fetch`/XHR/WebSocket are blocked at the
   platform layer, not merely by refusing a method.
2. **Behavioral (the broker).** `createBroker(host, granted)` dispatches a guest request to a
   **fixed whitelist** of host methods, and only when the owner granted that method's capability.
   Deny-by-default. The dispatch table is keyed by own-property lookup, so a plugin cannot reach
   an unlisted host property (`constructor`, `__proto__`, …). The broker is pure — no DOM, no
   port — given an injected host and grant set.

The token lives only in the host/auth context and is **never** posted across the channel.

## Capabilities

A capability gates exactly one host method (except `network`, which gates the frame):

| Capability             | Host method                  |
| ---------------------- | ---------------------------- |
| `components:register`  | `registerComponent(reg)`     |
| `content:read`         | `readContentModel()`         |
| `tokens:contribute`    | `contributeTokens(flatSrc)`  |
| `layout:contribute`    | `contributeLayout(mdx)`      |
| `network`              | — (opens the frame CSP)      |

The **effective grant** is the owner's approval ∩ the manifest's request. A capability the
manifest does not request, or the owner did not approve, is never in force.

## Protocol

A versioned (`nocms/sandbox@1`) postMessage exchange over a transferred `MessagePort`:

- Host → guest `ready` — sent once the frame loads, carrying the granted capabilities.
- Guest → host `invoke` — `{ id, method, params }`, correlated by `id`.
- Host → guest `result` / `error` — `error` is one of `capability-denied`, `unknown-method`,
  `host-error`; it never carries host internals.

Untagged or malformed messages are ignored, so the channel tolerates unrelated traffic.

## Usage

Host side (in the editor/auth context that holds the token):

```ts
import { loadPlugin } from "@nocms/sandbox";

const plugin = loadPlugin(manifest, hostApi, { grant: approvedCapabilities });
// ...
plugin.dispose();
```

Guest side (inside the plugin frame — receives a port, never a token):

```ts
import { createHostClient } from "@nocms/sandbox";

const host = createHostClient(port);
const model = await host.readContentModel(); // rejects with SandboxError if not granted
```

Architecture invariants and conventions live in the repo `CLAUDE.md`.
