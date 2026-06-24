import { describe, expect, it } from "vitest";
import {
  AuthError,
  beginSignIn,
  completeSignIn,
  fromPat,
  isExpired,
  refresh,
} from "./index";
import { generatePkce, sha256Base64url } from "./pkce";

function jsonFetch(
  body: unknown,
  ok = true,
): { fetch: typeof fetch; lastBody: () => unknown } {
  let captured: unknown;
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    captured = JSON.parse(init.body as string);
    return new Response(JSON.stringify(body), { status: ok ? 200 : 400 });
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, lastBody: () => captured };
}

describe("PKCE", () => {
  it("derives the challenge as the S256 of the verifier", async () => {
    const { verifier, challenge } = await generatePkce();
    expect(challenge).toBe(await sha256Base64url(verifier));
    expect(challenge).not.toContain("="); // base64url, unpadded
    expect(verifier.length).toBeGreaterThanOrEqual(43);
  });
});

describe("beginSignIn", () => {
  it("builds an authorize URL carrying the S256 challenge and state", async () => {
    const start = await beginSignIn({
      clientId: "Iv1.abc",
      redirectUri: "https://site/callback",
      scope: "repo",
    });
    const url = new URL(start.authorizeUrl);
    expect(url.searchParams.get("client_id")).toBe("Iv1.abc");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(start.state);
    expect(url.searchParams.get("code_challenge")).toBe(
      await sha256Base64url(start.verifier),
    );
  });
});

describe("completeSignIn", () => {
  it("exchanges the code via the relay and computes expiry from now", async () => {
    const { fetch, lastBody } = jsonFetch({
      access_token: "gho_x",
      expires_in: 28800,
      refresh_token: "ghr_y",
    });
    const session = await completeSignIn(
      { clientId: "id", relayUrl: "https://relay" },
      { code: "code1", verifier: "ver1" },
      { fetch, now: () => 1000 },
    );
    expect(session).toEqual({
      accessToken: "gho_x",
      expiresAt: 1000 + 28800 * 1000,
      refreshToken: "ghr_y",
    });
    expect(lastBody()).toEqual({
      code: "code1",
      codeVerifier: "ver1",
      redirectUri: undefined,
    });
  });

  it("throws without a relay URL", async () => {
    await expect(
      completeSignIn({ clientId: "id" }, { code: "c", verifier: "v" }),
    ).rejects.toBeInstanceOf(AuthError);
  });
});

describe("refresh", () => {
  it("posts the refresh token and returns the rotated session", async () => {
    const { fetch, lastBody } = jsonFetch({
      access_token: "gho_new",
      refresh_token: "ghr_new",
    });
    const session = await refresh(
      { clientId: "id", relayUrl: "https://relay" },
      { accessToken: "old", expiresAt: 0, refreshToken: "ghr_old" },
      { fetch, now: () => 0 },
    );
    expect(lastBody()).toEqual({ refreshToken: "ghr_old" });
    expect(session.refreshToken).toBe("ghr_new");
  });
});

describe("isExpired / fromPat", () => {
  it("treats a PAT as never expiring", () => {
    const session = fromPat("github_pat_x");
    expect(session.expiresAt).toBe(Number.POSITIVE_INFINITY);
    expect(isExpired(session)).toBe(false);
  });

  it("flags a session inside the expiry skew window", () => {
    expect(
      isExpired({ accessToken: "t", expiresAt: 1_000_000 }, 1_000_000 - 30_000),
    ).toBe(true);
    expect(
      isExpired({ accessToken: "t", expiresAt: 1_000_000 }, 1_000_000 - 120_000),
    ).toBe(false);
  });
});
