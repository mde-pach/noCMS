// The browser GitHub client. Reads and writes go straight to api.github.com
// from the browser with the owner's token (REST contents + GraphQL
// createCommitOnBranch). The OAuth exchange is the relay's job, not this client's.

import type { RepoPath, RepoRef } from "@nocms/core";
import { createClient } from "./client";

/** Supplies a short-lived user token per request (from @nocms/auth). */
export type TokenProvider = () => Promise<string>;

export interface FileChange {
  path: RepoPath;
  /** UTF-8 text, or base64 for binary media */
  contents: string;
  encoding: "utf-8" | "base64";
}

export interface GitHubClient {
  readFile(repo: RepoRef, path: RepoPath): Promise<string>;
  /** create a session branch off the repo's current branch */
  createSessionBranch(repo: RepoRef, name: string): Promise<RepoRef>;
  commit(repo: RepoRef, message: string, files: FileChange[]): Promise<string>;
  /** publish: merge a session branch into the target branch (default `main`) */
  publish(repo: RepoRef, fromBranch: string, into?: string): Promise<void>;
}

export interface ClientOptions {
  fetch?: typeof fetch;
  apiBase?: string;
  graphqlUrl?: string;
}

export function createGitHubClient(
  token: TokenProvider,
  options: ClientOptions = {},
): GitHubClient {
  return createClient(token, options);
}

export { GitHubError } from "./http";
