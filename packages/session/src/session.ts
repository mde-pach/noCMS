import type { CollectionDef, CollectionEntry, RepoPath, RepoRef } from "@nocms/core";
import type { FileChange, GitHubClient } from "@nocms/github";
import { serializeEntry } from "./serialize";

export interface EditingSessionOptions {
  client: GitHubClient;
  collections: CollectionDef[];
  /** explicit session-branch name; defaults to `nocms/session-<now()>` */
  branchName?: string;
  /** branch publish merges into; defaults to the branch the session forked from */
  publishInto?: string;
  now?: () => number;
}

export interface EditingSession {
  /** the ref the session forked from (its publish target by default) */
  readonly base: RepoRef;
  /** the per-session working branch ref */
  branchRef(): RepoRef;
  /** create the session branch and load its content into entries */
  open(): Promise<CollectionEntry[]>;
  entries(): CollectionEntry[];
  /** stage ready file changes (the editor's serialized output) */
  stage(...changes: FileChange[]): void;
  /** stage an edited entry, serialized back to MDX text */
  stageEntry(entry: CollectionEntry): void;
  staged(): FileChange[];
  /** commit the staged batch; resolves to the commit oid, or null if nothing is staged */
  commit(message: string): Promise<string | null>;
  /** merge the session branch into the publish target, then delete it */
  publish(): Promise<void>;
}

// One editing session = one branch. Edits accumulate as staged file changes (keyed
// by path, last write wins) and commit as a batch; publishing merges the branch
// back and cleans it up. The GitHub client and clock are injected — nothing here
// touches the network or a real clock directly.
export function openEditingSession(
  base: RepoRef,
  opts: EditingSessionOptions,
): EditingSession {
  const now = opts.now ?? Date.now;
  const name = opts.branchName ?? `nocms/session-${now()}`;
  const publishInto = opts.publishInto ?? base.branch;

  let branch: RepoRef = { ...base, branch: name };
  let loaded: CollectionEntry[] = [];
  const stagedByPath = new Map<RepoPath, FileChange>();

  return {
    base,

    branchRef() {
      return branch;
    },

    async open() {
      branch = await opts.client.createSessionBranch(base, name);
      loaded = await opts.client.loadEntries(branch, opts.collections);
      return loaded;
    },

    entries() {
      return loaded;
    },

    stage(...changes) {
      for (const change of changes) stagedByPath.set(change.path, change);
    },

    stageEntry(entry) {
      const change = serializeEntry(entry);
      stagedByPath.set(change.path, change);
    },

    staged() {
      return [...stagedByPath.values()];
    },

    async commit(message) {
      if (stagedByPath.size === 0) return null;
      const oid = await opts.client.commit(branch, message, [...stagedByPath.values()]);
      stagedByPath.clear();
      return oid;
    },

    async publish() {
      await opts.client.publish(base, branch.branch, publishInto);
      try {
        await opts.client.deleteBranch(base, branch.branch);
      } catch {
        // Cleanup is best-effort: the merge already published, so a failed branch
        // delete must not surface as a publish failure.
      }
    },
  };
}
