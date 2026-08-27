import { type AuthConfig, isExpired, refresh, type Session } from "./index";

export interface SessionStore {
  /** seed from a previously persisted session, if any */
  get?(): Promise<Session | null> | Session | null;
  set(session: Session): Promise<void> | void;
}

export interface TokenProviderOptions {
  session: Session;
  config: AuthConfig;
  store: SessionStore;
  now?: () => number;
  /** refresh this far before the hard expiry (default 60s) */
  skewMs?: number;
  fetch?: typeof fetch;
}

export type TokenProvider = () => Promise<string>;

export function createTokenProvider(opts: TokenProviderOptions): TokenProvider {
  const now = opts.now ?? Date.now;
  const skewMs = opts.skewMs ?? 60_000;
  let current = opts.session;
  // One in-flight refresh is shared so concurrent requests don't each rotate the
  // token (a second refresh with the consumed token would fail).
  let inflight: Promise<Session> | null = null;
  let hydrated = false;

  async function hydrate(): Promise<void> {
    if (hydrated) return;
    hydrated = true;
    const stored = await opts.store.get?.();
    // A persisted session that outlives ours was rotated elsewhere (another tab) — adopt it.
    if (stored && stored.expiresAt > current.expiresAt) current = stored;
  }

  async function ensureFresh(): Promise<Session> {
    await hydrate();
    if (!isExpired(current, now(), skewMs)) return current;
    // A PAT (no refresh token) never expires and never refreshes.
    if (!current.refreshToken) return current;
    if (!inflight) {
      inflight = refresh(opts.config, current, { fetch: opts.fetch, now })
        .then(async (rotated) => {
          current = rotated;
          await opts.store.set(rotated);
          return rotated;
        })
        .finally(() => {
          inflight = null;
        });
    }
    return inflight;
  }

  return async () => (await ensureFresh()).accessToken;
}
