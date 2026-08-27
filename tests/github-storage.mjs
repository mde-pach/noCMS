/**
 * Exercises the GitHub storage adapter against a real repository, on a scratch branch.
 * Non-destructive: it creates `nocms-v2-storage-test`, writes there, and deletes it.
 */

import { execFileSync } from "node:child_process";
import { createGithubStorage } from "../src/lib/storage/github.mjs";

const token = execFileSync("gh", ["auth", "token"]).toString().trim();
const [owner, repo] = (process.env.NOCMS_TEST_REPO ?? "mde-pach/noCMS").split("/");
const branch = "nocms-v2-storage-test";
const results = [];
const check = (n, ok, extra = "") =>
  results.push(`${ok ? "PASS" : "FAIL"}  ${n}${extra ? `  — ${extra}` : ""}`);

const gh = async (path, init = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
};

let created = false;
try {
  const main = await gh(`/repos/${owner}/${repo}/git/ref/heads/main`);
  await gh(`/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: main.object.sha }),
  }).catch(async (e) => {
    if (!/already exists/.test(e.message)) throw e;
  });
  created = true;

  const storage = createGithubStorage({ token, owner, repo, branch });
  check("adapter constructs", typeof storage.write === "function");
  check(
    "describeTarget names the repo",
    storage.describeTarget() === `${owner}/${repo}`,
  );

  const readme = await storage.read("README.md");
  check(
    "read returns file contents",
    typeof readme === "string" && readme.length > 0,
    `${readme?.length ?? 0} bytes`,
  );
  check(
    "read of a missing file returns null",
    (await storage.read("does/not/exist.astro")) === null,
  );

  const content = `---\nimport Hero from '../sections/hero/index.astro';\n---\n<Hero title="Written by noCMS at run ${Date.now()}" />\n`;
  const { sha } = await storage.write(
    [{ path: "nocms-v2-test/page.astro", content }],
    "test: noCMS storage adapter",
  );
  check("write returns a commit sha", /^[0-9a-f]{40}$/.test(sha ?? ""), sha);

  const back = await storage.read("nocms-v2-test/page.astro");
  check("written content reads back byte-identical", back === content);

  const commit = await gh(`/repos/${owner}/${repo}/commits/${sha}`);
  check(
    "one commit for the whole change set",
    commit.files.length === 1,
    `${commit.files.length} file(s)`,
  );
  check(
    "commit message is ours",
    commit.commit.message === "test: noCMS storage adapter",
  );

  const multi = await storage.write(
    [
      { path: "nocms-v2-test/a.astro", content: "<p>a</p>\n" },
      { path: "nocms-v2-test/b.astro", content: "<p>b</p>\n" },
    ],
    "test: two files, one commit",
  );
  const multiCommit = await gh(`/repos/${owner}/${repo}/commits/${multi.sha}`);
  check(
    "multiple files land in a single commit",
    multiCommit.files.length === 2,
    `${multiCommit.files.length} files`,
  );
  check("a publish is one revertable step", multiCommit.parents.length === 1);
} catch (err) {
  check(err.message.slice(0, 120), false);
} finally {
  if (created) {
    await gh(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, { method: "DELETE" })
      .then(() => results.push("cleanup  scratch branch deleted"))
      .catch((e) => results.push(`cleanup  FAILED: ${e.message.slice(0, 80)}`));
  }
  console.log(results.join("\n"));
  process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
