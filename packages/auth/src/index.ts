// Client-side GitHub App sign-in: PKCE (S256) with short-lived rotating tokens
// (~8h user, ~6mo refresh). The browser can't redeem the code (no CORS on the
// token endpoint), so the stateless relay does only the exchange and refresh.
// A fine-grained PAT is the zero-relay fallback. The token never leaves the
// host/auth context — plugin code never sees it.

import { generatePkce, randomState } from "./pkce";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

export interface AuthConfig {
  /** GitHub App client id (public) */
  clientId: string;
  /** stateless exchange relay base URL; omit to require a PAT */
  relayUrl?: string;
  redirectUri?: string;
  scope?: string;
  /** override the authorize endpoint (tests / GitHub Enterprise) */
  authorizeUrl?: string;
}

export interface Session {
  accessToken: string;
  /** epoch ms; Infinity for a non-expiring PAT */
  expiresAt: number;
  /** rotates on every refresh */
  refreshToken?: string;
}

/** Carried across the redirect: the verifier proves the code is ours; state guards CSRF. */
export interface SignInStart {
  authorizeUrl: string;
  verifier: string;
  state: string;
}

export interface AuthDeps {
  fetch?: typeof fetch;
  now?: () => number;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
}

function toSession(token: TokenResponse, now: () => number): Session {
  return {
    accessToken: token.access_token,
    expiresAt: token.expires_in
      ? now() + token.expires_in * 1000
      : Number.POSITIVE_INFINITY,
    refreshToken: token.refresh_token,
  };
}

async function postToRelay(
  config: AuthConfig,
  path: string,
  body: Record<string, unknown>,
  deps: AuthDeps,
): Promise<Session> {
  if (!config.relayUrl) throw new AuthError("relayUrl is required (or use fromPat)");
  const res = await (deps.fetch ?? fetch)(`${config.relayUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new AuthError(`relay ${path} failed: ${res.status}`);
  return toSession((await res.json()) as TokenResponse, deps.now ?? Date.now);
}

/** Build the authorize URL and the PKCE secrets the caller must stash for the callback. */
export async function beginSignIn(config: AuthConfig): Promise<SignInStart> {
  const { verifier, challenge } = await generatePkce();
  const state = randomState();
  const url = new URL(config.authorizeUrl ?? AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  if (config.redirectUri) url.searchParams.set("redirect_uri", config.redirectUri);
  if (config.scope) url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return { authorizeUrl: url.toString(), verifier, state };
}

/** Redeem the authorization code via the relay using the stashed verifier. */
export function completeSignIn(
  config: AuthConfig,
  params: { code: string; verifier: string },
  deps: AuthDeps = {},
): Promise<Session> {
  return postToRelay(
    config,
    "/exchange",
    {
      code: params.code,
      codeVerifier: params.verifier,
      redirectUri: config.redirectUri,
    },
    deps,
  );
}

/** Refresh before expiry; the refresh token rotates, so use the returned session. */
export function refresh(
  config: AuthConfig,
  session: Session,
  deps: AuthDeps = {},
): Promise<Session> {
  if (!session.refreshToken) throw new AuthError("session has no refresh token");
  return postToRelay(config, "/refresh", { refreshToken: session.refreshToken }, deps);
}

/** True if the session is expired or will expire within `skewMs` (default 60s). */
export function isExpired(
  session: Session,
  now: number = Date.now(),
  skewMs = 60_000,
): boolean {
  return session.expiresAt - skewMs <= now;
}

/** Zero-relay fallback: a repo-scoped fine-grained PAT. */
export function fromPat(token: string): Session {
  return { accessToken: token, expiresAt: Number.POSITIVE_INFINITY };
}
