import { describe, expect, it } from "vitest";
import { fromPat, type Session } from "./index";
import { createTokenProvider, type SessionStore } from "./token-provider";

const config = { clientId: "id", relayUrl: "https://relay" };

function refreshFetch(responses: Record<string, unknown>[]): {
  fetch: typeof fetch;
  count: () => number;
} {
  let i = 0;
  const fetchImpl = (async () => {
    const body = responses[Math.min(i, responses.length - 1)];
    i++;
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, count: () => i };
}

function memoryStore(seed?: Session): SessionStore & { saved: Session[] } {
  const saved: Session[] = [];
  let value = seed ?? null;
  return {
    saved,
    get: () => value,
    set: (s) => {
      value = s;
      saved.push(s);
    },
  };
}

describe("createTokenProvider", () => {
  it("returns the current token without refreshing while fresh", async () => {
    const session: Session = {
      accessToken: "fresh",
      expiresAt: 10_000_000,
      refreshToken: "r",
    };
    const { fetch, count } = refreshFetch([{ access_token: "new" }]);
    const token = createTokenProvider({
      session,
      config,
      store: memoryStore(),
      now: () => 0,
      fetch,
    });
    expect(await token()).toBe("fresh");
    expect(count()).toBe(0);
  });

  it("refreshes within the skew window and persists the rotated session", async () => {
    const session: Session = {
      accessToken: "old",
      expiresAt: 100_000,
      refreshToken: "r_old",
    };
    const { fetch } = refreshFetch([
      { access_token: "rotated", expires_in: 28_800, refresh_token: "r_new" },
    ]);
    const store = memoryStore();
    const token = createTokenProvider({
      session,
      config,
      store,
      now: () => 100_000 - 30_000, // inside the default 60s skew
      fetch,
    });
    expect(await token()).toBe("rotated");
    expect(store.saved).toHaveLength(1);
    expect(store.saved[0]).toMatchObject({
      accessToken: "rotated",
      refreshToken: "r_new",
    });
  });

  it("never refreshes a PAT (no refresh token, infinite expiry)", async () => {
    const { fetch, count } = refreshFetch([{ access_token: "nope" }]);
    const token = createTokenProvider({
      session: fromPat("github_pat_x"),
      config,
      store: memoryStore(),
      now: () => 1e15,
      fetch,
    });
    expect(await token()).toBe("github_pat_x");
    expect(count()).toBe(0);
  });

  it("shares one refresh across concurrent calls", async () => {
    const session: Session = { accessToken: "old", expiresAt: 0, refreshToken: "r" };
    const { fetch, count } = refreshFetch([
      { access_token: "rotated", expires_in: 28_800, refresh_token: "r2" },
    ]);
    const token = createTokenProvider({
      session,
      config,
      store: memoryStore(),
      now: () => 1_000,
      fetch,
    });
    const [a, b] = await Promise.all([token(), token()]);
    expect([a, b]).toEqual(["rotated", "rotated"]);
    expect(count()).toBe(1);
  });

  it("adopts a fresher persisted session (rotated in another tab)", async () => {
    const stale: Session = {
      accessToken: "stale",
      expiresAt: 1_000,
      refreshToken: "r",
    };
    const fresher: Session = {
      accessToken: "fromOtherTab",
      expiresAt: 1_000_000,
      refreshToken: "r2",
    };
    const { fetch, count } = refreshFetch([{ access_token: "x" }]);
    const token = createTokenProvider({
      session: stale,
      config,
      store: memoryStore(fresher),
      now: () => 0,
      fetch,
    });
    expect(await token()).toBe("fromOtherTab");
    expect(count()).toBe(0);
  });
});
