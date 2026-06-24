import type { RepoRef } from "@nocms/core";
import { decodeBase64ToText, encodeTextToBase64 } from "./encoding";
import { graphql, type HttpDeps, rest } from "./http";
import type { ClientOptions, FileChange, GitHubClient, TokenProvider } from "./index";

const COMMIT_MUTATION = `
  mutation ($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) {
      commit { oid }
    }
  }`;

interface RefResponse {
  object: { sha: string };
}

async function headOid(deps: HttpDeps, repo: RepoRef): Promise<string> {
  const ref = await rest<RefResponse>(
    deps,
    "GET",
    `/repos/${repo.owner}/${repo.repo}/git/ref/heads/${repo.branch}`,
  );
  return ref.object.sha;
}

function toBase64(file: FileChange): string {
  return file.encoding === "base64" ? file.contents : encodeTextToBase64(file.contents);
}

export function createClient(
  token: TokenProvider,
  options: ClientOptions,
): GitHubClient {
  const deps: HttpDeps = {
    fetch: options.fetch ?? fetch,
    token,
    apiBase: options.apiBase ?? "https://api.github.com",
    graphqlUrl: options.graphqlUrl ?? "https://api.github.com/graphql",
  };

  return {
    async readFile(repo, path) {
      const file = await rest<{ content: string }>(
        deps,
        "GET",
        `/repos/${repo.owner}/${repo.repo}/contents/${path}?ref=${repo.branch}`,
      );
      return decodeBase64ToText(file.content);
    },

    async createSessionBranch(repo, name) {
      const sha = await headOid(deps, repo);
      await rest(deps, "POST", `/repos/${repo.owner}/${repo.repo}/git/refs`, {
        ref: `refs/heads/${name}`,
        sha,
      });
      return { ...repo, branch: name };
    },

    async commit(repo, message, files) {
      const expectedHeadOid = await headOid(deps, repo);
      const additions = files.map((f) => ({ path: f.path, contents: toBase64(f) }));
      const result = await graphql<{
        createCommitOnBranch: { commit: { oid: string } };
      }>(deps, COMMIT_MUTATION, {
        input: {
          branch: {
            repositoryNameWithOwner: `${repo.owner}/${repo.repo}`,
            branchName: repo.branch,
          },
          message: { headline: message },
          expectedHeadOid,
          fileChanges: { additions },
        },
      });
      return result.createCommitOnBranch.commit.oid;
    },

    async publish(repo, fromBranch, into = "main") {
      await rest(deps, "POST", `/repos/${repo.owner}/${repo.repo}/merges`, {
        base: into,
        head: fromBranch,
      });
    },
  };
}
