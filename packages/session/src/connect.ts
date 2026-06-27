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
