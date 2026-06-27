import type { CollectionDef, CollectionEntry, RepoPath, RepoRef } from "@nocms/core";
import { createClient } from "./client";
import type { TreeEntry } from "./tree";

export type TokenProvider = () => Promise<string>;

export interface FileChange {
  path: RepoPath;
  /** UTF-8 text, or base64 for binary media */
  contents: string;
  encoding: "utf-8" | "base64";
}

export interface GitHubClient {
  readFile(repo: RepoRef, path: RepoPath): Promise<string>;
  listTree(repo: RepoRef): Promise<TreeEntry[]>;
  loadEntries(repo: RepoRef, collections: CollectionDef[]): Promise<CollectionEntry[]>;
  createSessionBranch(repo: RepoRef, name: string): Promise<RepoRef>;
  commit(repo: RepoRef, message: string, files: FileChange[]): Promise<string>;
  publish(repo: RepoRef, fromBranch: string, into?: string): Promise<void>;
  deleteBranch(repo: RepoRef, branch: string): Promise<void>;
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
export type { TreeEntry } from "./tree";
