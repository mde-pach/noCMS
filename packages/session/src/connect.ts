import type { AuthConfig, Session, SessionStore } from "@nocms/auth";
import { createTokenProvider } from "@nocms/auth";
import type { GitHubClient } from "@nocms/github";
import { createGitHubClient } from "@nocms/github";

export interface ConnectOptions {
  session: Session;
  config: AuthConfig;
  store: SessionStore;
  now?: () => number;
  fetch?: typeof fetch;
}

// The auth↔github seam: wire the auto-refreshing token provider into the GitHub
// client so reads and writes carry a always-fresh token. Inject fetch/clock and
// the whole stack is exercised with no real network.
export function connectGitHub(opts: ConnectOptions): GitHubClient {
  const token = createTokenProvider({
    session: opts.session,
    config: opts.config,
    store: opts.store,
    now: opts.now,
    fetch: opts.fetch,
  });
  return createGitHubClient(token, { fetch: opts.fetch });
}
