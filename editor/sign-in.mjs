/**
 * Sign-in for GitHub mode.
 *
 * GitHub still sends no CORS headers on its token endpoint, so a browser cannot redeem
 * the authorization code alone. The relay does that one exchange and nothing else — it
 * holds no session and stores no state. An owner can self-host it, or skip it entirely
 * with a fine-grained PAT, which is why both paths are offered here rather than one
 * being hidden in a troubleshooting page.
 */
import {
  beginSignIn,
  completeSignIn,
  fromPat,
  isExpired,
  refresh,
} from "../src/lib/auth/index.ts";
import { browserSessionStore, pendingSignIn } from "../src/lib/auth/session-store.mjs";

/** Resolve a usable session, refreshing silently when one is about to expire. */
export async function currentSession(config) {
  const stored = browserSessionStore.read();
  if (!stored) return null;
  if (!isExpired(stored)) return stored;
  if (!stored.refreshToken) {
    browserSessionStore.clear();
    return null;
  }
  try {
    const next = await refresh(config, stored);
    browserSessionStore.write(next);
    return next;
  } catch {
    browserSessionStore.clear();
    return null;
  }
}

/** Handle the ?code= leg of the redirect. Returns a session, or null if not a callback. */
export async function consumeRedirect(config) {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) return null;

  const pending = pendingSignIn.take();
  // A mismatched state means the callback did not come from the flow we started.
  if (!pending || pending.state !== state) throw new Error("sign-in state mismatch");

  const session = await completeSignIn(config, { code, verifier: pending.verifier });
  browserSessionStore.write(session);
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  window.history.replaceState({}, "", url.toString());
  return session;
}

export async function startSignIn(config) {
  const { authorizeUrl, verifier, state } = await beginSignIn(config);
  pendingSignIn.write({ verifier, state });
  window.location.assign(authorizeUrl);
}

export function signInWithToken(token) {
  const session = fromPat(token.trim());
  browserSessionStore.write(session);
  return session;
}

export function signOut() {
  browserSessionStore.clear();
}
