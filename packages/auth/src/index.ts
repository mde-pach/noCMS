// Client-side GitHub App sign-in: PKCE (S256) with short-lived rotating tokens
// (~8h user, ~6mo refresh). The browser can't redeem the code (no CORS on the
// token endpoint), so the stateless relay does only the exchange and refresh.
// A fine-grained PAT is the zero-relay fallback. The token never leaves the
// host/auth context — plugin code never sees it.

export interface AuthConfig {
  /** GitHub App client id (public) */
  clientId: string;
  /** stateless exchange relay base URL; omit to require a PAT */
  relayUrl?: string;
}

export interface Session {
  accessToken: string;
  expiresAt: number;
  /** rotates on every refresh */
  refreshToken?: string;
}

export function beginSignIn(_config: AuthConfig): Promise<{ authorizeUrl: string }> {
  throw new Error("not implemented: PKCE challenge + authorize URL");
}

export function completeSignIn(_config: AuthConfig, _code: string): Promise<Session> {
  throw new Error("not implemented: redeem code via relay");
}

export function refresh(_config: AuthConfig, _session: Session): Promise<Session> {
  throw new Error("not implemented: rotating refresh via relay");
}

/** Zero-relay fallback: a repo-scoped fine-grained PAT. */
export function fromPat(token: string): Session {
  return { accessToken: token, expiresAt: Number.POSITIVE_INFINITY };
}
