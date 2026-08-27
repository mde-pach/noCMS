import * as v from "valibot";

const EnvSchema = v.object({
  GITHUB_CLIENT_ID: v.pipe(v.string(), v.nonEmpty()),
  GITHUB_CLIENT_SECRET: v.pipe(v.string(), v.nonEmpty()),
  // The site origin allowed to call the relay; defaults to any so a self-host
  // works out of the box. Pin it in production.
  ALLOWED_ORIGIN: v.optional(v.string(), "*"),
  PORT: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.integer()),
    "3000",
  ),
});

export interface RelayConfig {
  clientId: string;
  clientSecret: string;
  allowedOrigin: string;
  port: number;
}

export function loadConfig(env: Record<string, string | undefined>): RelayConfig {
  const parsed = v.parse(EnvSchema, env);
  return {
    clientId: parsed.GITHUB_CLIENT_ID,
    clientSecret: parsed.GITHUB_CLIENT_SECRET,
    allowedOrigin: parsed.ALLOWED_ORIGIN,
    port: parsed.PORT,
  };
}
