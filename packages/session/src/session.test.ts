import type { CollectionDef, CollectionEntry, RepoPath, RepoRef } from "@nocms/core";
import type { FileChange, GitHubClient, TreeEntry } from "@nocms/github";
import { describe, expect, it } from "vitest";
import { openEditingSession } from "./session";

const base: RepoRef = { owner: "o", repo: "r", branch: "main" };
const path = (p: string) => p as RepoPath;
const collections: CollectionDef[] = [
  { name: "pages", path: "content/**/*.mdx", fields: {} },
];

interface Recorded {
  createdBranch?: string;
  loadedFrom?: RepoRef;
  commits: { repo: RepoRef; message: string; files: FileChange[] }[];
  published?: { repo: RepoRef; from: string; into?: string };
  deleted?: { repo: RepoRef; branch: string };
}

function fakeClient(
  entries: CollectionEntry[],
  overrides: Partial<GitHubClient> = {},
): { client: GitHubClient; rec: Recorded } {
  const rec: Recorded = { commits: [] };
  const client: GitHubClient = {
    async readFile() {
      return "";
    },
    async listTree(): Promise<TreeEntry[]> {
      return [];
    },
    async loadEntries(repo) {
      rec.loadedFrom = repo;
      return entries;
    },
    async createSessionBranch(repo, name) {
      rec.createdBranch = name;
      return { ...repo, branch: name };
    },
    async commit(repo, message, files) {
      rec.commits.push({ repo, message, files });
      return "oid1";
    },
    async publish(repo, from, into) {
      rec.published = { repo, from, into };
    },
    async deleteBranch(repo, branch) {
      rec.deleted = { repo, branch };
    },
    ...overrides,
  };
  return { client, rec };
}

const entry = (
  p: string,
  data: Record<string, unknown>,
  body: string,
): CollectionEntry => ({
  collection: "pages",
  path: path(p),
  data,
  body,
});

describe("openEditingSession", () => {
  it("derives a deterministic branch name from the injected clock", () => {
    const { client } = fakeClient([]);
    const session = openEditingSession(base, { client, collections, now: () => 1234 });
    expect(session.branchRef()).toEqual({
      owner: "o",
      repo: "r",
      branch: "nocms/session-1234",
    });
  });

  it("opens by creating the branch then loading entries from it", async () => {
    const entries = [entry("content/index.mdx", {}, "# Home")];
    const { client, rec } = fakeClient(entries);
    const session = openEditingSession(base, {
      client,
      collections,
      branchName: "nocms/s1",
    });
    expect(await session.open()).toEqual(entries);
    expect(rec.createdBranch).toBe("nocms/s1");
    expect(rec.loadedFrom).toEqual({ owner: "o", repo: "r", branch: "nocms/s1" });
    expect(session.entries()).toEqual(entries);
  });

  it("stages an edited entry as serialized MDX, last write per path winning", async () => {
    const { client } = fakeClient([]);
    const session = openEditingSession(base, {
      client,
      collections,
      branchName: "nocms/s1",
    });
    session.stageEntry(entry("content/a.mdx", { title: "v1" }, "one"));
    session.stageEntry(entry("content/a.mdx", { title: "v2" }, "two"));
    const staged = session.staged();
    expect(staged).toHaveLength(1);
    expect(staged[0]?.contents).toBe("---\ntitle: v2\n---\n\ntwo");
  });

  it("commits the staged batch and clears it", async () => {
    const { client, rec } = fakeClient([]);
    const session = openEditingSession(base, {
      client,
      collections,
      branchName: "nocms/s1",
    });
    session.stage({ path: path("content/a.mdx"), contents: "x", encoding: "utf-8" });
    const oid = await session.commit("edit a");
    expect(oid).toBe("oid1");
    expect(rec.commits).toHaveLength(1);
    expect(rec.commits[0]?.repo.branch).toBe("nocms/s1");
    expect(rec.commits[0]?.message).toBe("edit a");
    expect(session.staged()).toHaveLength(0);
  });

  it("commits nothing when nothing is staged", async () => {
    const { client, rec } = fakeClient([]);
    const session = openEditingSession(base, {
      client,
      collections,
      branchName: "nocms/s1",
    });
    expect(await session.commit("noop")).toBeNull();
    expect(rec.commits).toHaveLength(0);
  });

  it("publishes by merging into the base branch, then deletes the session branch", async () => {
    const { client, rec } = fakeClient([]);
    const session = openEditingSession(base, {
      client,
      collections,
      branchName: "nocms/s1",
    });
    await session.publish();
    expect(rec.published).toEqual({ repo: base, from: "nocms/s1", into: "main" });
    expect(rec.deleted).toEqual({ repo: base, branch: "nocms/s1" });
  });

  it("merges into an explicit publishInto when given", async () => {
    const { client, rec } = fakeClient([]);
    const session = openEditingSession(base, {
      client,
      collections,
      branchName: "nocms/s1",
      publishInto: "production",
    });
    await session.publish();
    expect(rec.published?.into).toBe("production");
  });

  it("treats branch cleanup as best-effort (a failed delete still publishes)", async () => {
    const { client, rec } = fakeClient([], {
      async deleteBranch() {
        throw new Error("ref already gone");
      },
    });
    const session = openEditingSession(base, {
      client,
      collections,
      branchName: "nocms/s1",
    });
    await expect(session.publish()).resolves.toBeUndefined();
    expect(rec.published?.from).toBe("nocms/s1");
  });
});
