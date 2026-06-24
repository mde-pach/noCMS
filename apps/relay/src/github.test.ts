import { describe, expect, it } from "vitest";
import { type ExchangeDeps, ExchangeError, exchangeCode, refreshToken } from "./github";

function fakeFetch(response: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(response), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

const deps = (fetchImpl: typeof fetch): ExchangeDeps => ({
  clientId: "id",
  clientSecret: "secret",
  fetch: fetchImpl,
});

describe("exchangeCode", () => {
  it("returns the token on success", async () => {
    const token = await exchangeCode(
      { code: "c", codeVerifier: "v" },
      deps(
        fakeFetch({ access_token: "gho_x", token_type: "bearer", expires_in: 28800 }),
      ),
    );
    expect(token.access_token).toBe("gho_x");
    expect(token.expires_in).toBe(28800);
  });

  it("throws ExchangeError when GitHub returns an error body (HTTP 200)", async () => {
    await expect(
      exchangeCode(
        { code: "bad", codeVerifier: "v" },
        deps(fakeFetch({ error: "bad_verification_code", error_description: "nope" })),
      ),
    ).rejects.toBeInstanceOf(ExchangeError);
  });

  it("sends the client secret to GitHub but the caller never supplies it", async () => {
    let sentBody: Record<string, unknown> = {};
    const spy: typeof fetch = (async (_url: string, init: RequestInit) => {
      sentBody = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ access_token: "t", token_type: "bearer" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as unknown as typeof fetch;

    await exchangeCode({ code: "c", codeVerifier: "v" }, deps(spy));
    expect(sentBody.client_secret).toBe("secret");
    expect(sentBody.code_verifier).toBe("v");
  });
});

describe("refreshToken", () => {
  it("uses the refresh_token grant", async () => {
    let sentBody: Record<string, unknown> = {};
    const spy: typeof fetch = (async (_url: string, init: RequestInit) => {
      sentBody = JSON.parse(init.body as string);
      return new Response(
        JSON.stringify({
          access_token: "t2",
          token_type: "bearer",
          refresh_token: "r2",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const token = await refreshToken({ refreshToken: "r1" }, deps(spy));
    expect(sentBody.grant_type).toBe("refresh_token");
    expect(token.refresh_token).toBe("r2");
  });
});
