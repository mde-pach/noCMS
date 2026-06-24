import type { RepoPath, RepoRef } from "@nocms/core";
import { describe, expect, it } from "vitest";
import { encodeTextToBase64 } from "./encoding";
import { createGitHubClient, GitHubError } from "./index";

const repo: RepoRef = { owner: "o", repo: "r", branch: "main" };
const path = (p: string) => p as RepoPath;

interface Call {
  url: string;
  method: string;
  body: unknown;
}

function mockFetch(routes: Record<string, unknown>) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    calls.push({
      url,
      method,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    });
    const key = `${method} ${url}`;
    const match = Object.keys(routes).find((k) => key.startsWith(k));
    if (!match) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(routes[match]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { fetch: impl, calls };
}

const token = async () => "gho_test";

describe("readFile", () => {
  it("decodes base64 contents at the branch ref", async () => {
    const { fetch } = mockFetch({
      "GET https://api.github.com/repos/o/r/contents/content/index.mdx?ref=main": {
        content: encodeTextToBase64("# Hello"),
      },
    });
    const client = createGitHubClient(token, { fetch });
    expect(await client.readFile(repo, path("content/index.mdx"))).toBe("# Hello");
  });
});

describe("createSessionBranch", () => {
  it("reads the head sha and creates a new ref", async () => {
    const { fetch, calls } = mockFetch({
      "GET https://api.github.com/repos/o/r/git/ref/heads/main": {
        object: { sha: "abc123" },
      },
      "POST https://api.github.com/repos/o/r/git/refs": {},
    });
    const client = createGitHubClient(token, { fetch });
    const branch = await client.createSessionBranch(repo, "session/x");
    expect(branch).toEqual({ owner: "o", repo: "r", branch: "session/x" });
    const post = calls.find((c) => c.method === "POST");
    expect(post?.body).toEqual({ ref: "refs/heads/session/x", sha: "abc123" });
  });
});

describe("commit", () => {
  it("commits via createCommitOnBranch with base64 additions", async () => {
    const { fetch, calls } = mockFetch({
      "GET https://api.github.com/repos/o/r/git/ref/heads/main": {
        object: { sha: "head1" },
      },
      "POST https://api.github.com/graphql": {
        data: { createCommitOnBranch: { commit: { oid: "newoid" } } },
      },
    });
    const client = createGitHubClient(token, { fetch });
    const oid = await client.commit(repo, "edit", [
      { path: path("a.mdx"), contents: "hi", encoding: "utf-8" },
    ]);
    expect(oid).toBe("newoid");

    const gql = calls.find((c) => c.url.endsWith("/graphql"));
    const input = (gql?.body as { variables: { input: Record<string, unknown> } })
      .variables.input;
    expect(input.expectedHeadOid).toBe("head1");
    expect(input.fileChanges).toEqual({
      additions: [{ path: "a.mdx", contents: encodeTextToBase64("hi") }],
    });
  });

  it("throws GitHubError when GraphQL returns errors", async () => {
    const { fetch } = mockFetch({
      "GET https://api.github.com/repos/o/r/git/ref/heads/main": {
        object: { sha: "head1" },
      },
      "POST https://api.github.com/graphql": { errors: [{ message: "stale head" }] },
    });
    const client = createGitHubClient(token, { fetch });
    await expect(
      client.commit(repo, "edit", [
        { path: path("a.mdx"), contents: "x", encoding: "utf-8" },
      ]),
    ).rejects.toBeInstanceOf(GitHubError);
  });
});

describe("publish", () => {
  it("merges the session branch into the target", async () => {
    const { fetch, calls } = mockFetch({
      "POST https://api.github.com/repos/o/r/merges": { merged: true },
    });
    const client = createGitHubClient(token, { fetch });
    await client.publish(repo, "session/x");
    expect(calls[0]?.body).toEqual({ base: "main", head: "session/x" });
  });
});
