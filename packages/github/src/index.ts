// The browser GitHub client. Reads and writes go straight to api.github.com
// from the browser with the owner's token (REST contents + GraphQL
// createCommitOnBranch). The OAuth exchange is the relay's job, not this client's.

import type { RepoPath, RepoRef } from "@nocms/core";

/** Supplies a short-lived user token per request (from @nocms/auth). */
export type TokenProvider = () => Promise<string>;

export interface FileChange {
  path: RepoPath;
  /** UTF-8 text, or base64 for binary media */
  contents: string;
  encoding: "utf-8" | "base64";
}

export interface GitHubClient {
  /** repos where the App is installed */
  listRepos(): Promise<RepoRef[]>;
  readFile(repo: RepoRef, path: RepoPath): Promise<string>;
  /** create a session branch off `main` */
  createSessionBranch(repo: RepoRef, name: string): Promise<RepoRef>;
  commit(repo: RepoRef, message: string, files: FileChange[]): Promise<string>;
  /** publish: merge the session branch into `main` */
  publish(repo: RepoRef, fromBranch: string): Promise<void>;
}

export function createGitHubClient(_token: TokenProvider): GitHubClient {
  throw new Error("not implemented: browser GitHub client");
}
