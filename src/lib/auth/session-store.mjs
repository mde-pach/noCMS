/**
 * Where the owner's session lives: their own browser, on their own site's origin.
 * Nothing of ours ever holds it. A PAT is stored the same way — the difference is
 * only that it does not expire and cannot be refreshed.
 */
const KEY = "nocms:session";

export const browserSessionStore = {
  read() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  write(session) {
    try {
      localStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      /* private mode: the session simply does not persist */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* nothing to do */
    }
  },
};

/** Carried across the OAuth redirect only; cleared as soon as it is used. */
const PENDING = "nocms:pending-signin";

export const pendingSignIn = {
  write(value) {
    sessionStorage.setItem(PENDING, JSON.stringify(value));
  },
  take() {
    const raw = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    return raw ? JSON.parse(raw) : null;
  },
};
