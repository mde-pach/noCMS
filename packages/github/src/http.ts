import type { TokenProvider } from "./index";

export class GitHubError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(`GitHub API ${status}: ${message}`);
    this.name = "GitHubError";
  }
}

export interface HttpDeps {
  fetch: typeof fetch;
  token: TokenProvider;
  apiBase: string;
  graphqlUrl: string;
}

async function authHeaders(deps: HttpDeps): Promise<Record<string, string>> {
  return {
    authorization: `Bearer ${await deps.token()}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
}

/** REST request. Returns parsed JSON, or throws GitHubError on a non-2xx. */
export async function rest<T>(
  deps: HttpDeps,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await deps.fetch(`${deps.apiBase}${path}`, {
    method,
    headers: {
      ...(await authHeaders(deps)),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new GitHubError(res.status, await res.text());
  return (await res.json()) as T;
}

/** GraphQL request. Throws GitHubError if the response carries `errors`. */
export async function graphql<T>(
  deps: HttpDeps,
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const res = await deps.fetch(deps.graphqlUrl, {
    method: "POST",
    headers: { ...(await authHeaders(deps)), "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new GitHubError(res.status, await res.text());
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new GitHubError(200, json.errors.map((e) => e.message).join("; "));
  }
  return json.data as T;
}
