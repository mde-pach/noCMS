import type { CollectionDef, RepoPath, RepoRef } from "@nocms/core";
import { describe, expect, it } from "vitest";
import { connectGitHub } from "./connect";

const repo: RepoRef = { owner: "o", repo: "r", branch: "main" };
const collections: CollectionDef[] = [
  { name: "pages", path: "content/**/*.mdx", fields: {} },
];

function base64(text: string): string {
  return Buffer.from(text, "utf-8").toString("base64");
}

interface Seen {
  url: string;
  method: string;
  auth: string | undefined;
}

// A GitHub + relay stub: the relay rotates the token, and every api.github.com call
// records the Authorization header so we can prove the refreshed token flows through.
function stubFetch(): { fetch: typeof fetch; seen: Seen[] } {
  const seen: Seen[] = [];
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const headers = (init.headers ?? {}) as Record<string, string>;
    seen.push({ url, method, auth: headers.authorization });

    if (url.endsWith("/refresh")) {
      return new Response(
        JSON.stringify({
          access_token: "rotated",
          expires_in: 28_800,
          refresh_token: "r2",
        }),
        { status: 200 },
      );
    }
    if (url.includes("/git/trees/main")) {
      return new Response(
        JSON.stringify({
          truncated: false,
          tree: [{ path: "content/index.mdx", type: "blob", sha: "b1" }],
        }),
        { status: 200 },
      );
    }
    if (url.includes("/contents/content/index.mdx")) {
      return new Response(JSON.stringify({ content: base64("# Home") }), {
        status: 200,
      });
    }
    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, seen };
}

describe("connectGitHub", () => {
  it("refreshes an expiring session and carries the rotated token into GitHub reads", async () => {
    const { fetch, seen } = stubFetch();
    const saved: unknown[] = [];
    const client = connectGitHub({
      session: { accessToken: "old", expiresAt: 1_000, refreshToken: "r1" },
      config: { clientId: "id", relayUrl: "https://relay" },
      store: { set: (s) => void saved.push(s) },
      now: () => 0, // session expires at 1_000, inside the 60s skew → refresh first
      fetch,
    });

    const entries = await client.loadEntries(repo, collections);

    expect(entries).toEqual([
      {
        collection: "pages",
        path: "content/index.mdx" as RepoPath,
        data: {},
        body: "# Home",
      },
    ]);
    // The relay was hit once to rotate, and the rotated session was persisted.
    expect(seen.filter((s) => s.url.endsWith("/refresh"))).toHaveLength(1);
    expect(saved).toHaveLength(1);
    // Every GitHub request carried the refreshed bearer token.
    const apiCalls = seen.filter((s) => s.url.includes("api.github.com"));
    expect(apiCalls.length).toBeGreaterThan(0);
    expect(apiCalls.every((s) => s.auth === "Bearer rotated")).toBe(true);
  });
});
