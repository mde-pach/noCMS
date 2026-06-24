// The exchange itself, decoupled from HTTP so it can be unit-tested with a fake
// fetch. The client secret stays here and is never returned to the caller.

import * as v from "valibot";

const TOKEN_URL = "https://github.com/login/oauth/access_token";

export interface ExchangeDeps {
  clientId: string;
  clientSecret: string;
  fetch: typeof fetch;
}

/** GitHub's token response. Refresh fields appear only for expiring-token apps. */
const TokenResponseSchema = v.object({
  access_token: v.string(),
  token_type: v.string(),
  scope: v.optional(v.string()),
  expires_in: v.optional(v.number()),
  refresh_token: v.optional(v.string()),
  refresh_token_expires_in: v.optional(v.number()),
});
export type TokenResponse = v.InferOutput<typeof TokenResponseSchema>;

// GitHub answers OAuth failures with HTTP 200 and an `error` body, so success
// can't be inferred from status alone.
const ErrorResponseSchema = v.object({
  error: v.string(),
  error_description: v.optional(v.string()),
});

export class ExchangeError extends Error {
  constructor(
    public readonly code: string,
    description?: string,
  ) {
    super(description ?? code);
    this.name = "ExchangeError";
  }
}

async function postForm(
  deps: ExchangeDeps,
  body: Record<string, string>,
): Promise<TokenResponse> {
  const res = await deps.fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json();

  const error = v.safeParse(ErrorResponseSchema, json);
  if (error.success) {
    throw new ExchangeError(error.output.error, error.output.error_description);
  }
  return v.parse(TokenResponseSchema, json);
}

export function exchangeCode(
  params: { code: string; codeVerifier: string; redirectUri?: string },
  deps: ExchangeDeps,
): Promise<TokenResponse> {
  return postForm(deps, {
    client_id: deps.clientId,
    client_secret: deps.clientSecret,
    code: params.code,
    code_verifier: params.codeVerifier,
    ...(params.redirectUri ? { redirect_uri: params.redirectUri } : {}),
  });
}

export function refreshToken(
  params: { refreshToken: string },
  deps: ExchangeDeps,
): Promise<TokenResponse> {
  return postForm(deps, {
    client_id: deps.clientId,
    client_secret: deps.clientSecret,
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
  });
}
