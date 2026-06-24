import * as v from "valibot";
import { loadConfig, type RelayConfig } from "./config";
import { ExchangeError, exchangeCode, refreshToken } from "./github";

const ExchangeRequest = v.object({
  code: v.pipe(v.string(), v.nonEmpty()),
  codeVerifier: v.pipe(v.string(), v.nonEmpty()),
  redirectUri: v.optional(v.string()),
});

const RefreshRequest = v.object({
  refreshToken: v.pipe(v.string(), v.nonEmpty()),
});

function cors(origin: string): Record<string, string> {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  };
}

function json(
  body: unknown,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function buildHandler(config: RelayConfig, fetchImpl: typeof fetch = fetch) {
  const deps = {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    fetch: fetchImpl,
  };
  const headers = cors(config.allowedOrigin);

  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (url.pathname === "/health") return json({ ok: true }, 200, headers);
    if (req.method !== "POST")
      return json({ error: "method_not_allowed" }, 405, headers);

    try {
      if (url.pathname === "/exchange") {
        const { code, codeVerifier, redirectUri } = v.parse(
          ExchangeRequest,
          await req.json(),
        );
        const token = await exchangeCode({ code, codeVerifier, redirectUri }, deps);
        return json(token, 200, headers);
      }
      if (url.pathname === "/refresh") {
        const { refreshToken: rt } = v.parse(RefreshRequest, await req.json());
        const token = await refreshToken({ refreshToken: rt }, deps);
        return json(token, 200, headers);
      }
      return json({ error: "not_found" }, 404, headers);
    } catch (err) {
      if (err instanceof ExchangeError) return json({ error: err.code }, 400, headers);
      if (err instanceof v.ValiError)
        return json({ error: "invalid_request" }, 400, headers);
      return json({ error: "internal_error" }, 500, headers);
    }
  };
}

if (import.meta.main) {
  const config = loadConfig(process.env);
  const handle = buildHandler(config);
  Bun.serve({ port: config.port, fetch: handle });
  // Logs carry no secrets — just that the relay is up.
  console.log(`relay listening on :${config.port}`);
}
