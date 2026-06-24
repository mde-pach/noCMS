// The batch tier: precompute features from the whole corpus in Actions —
// search, i18n, manifests, feeds. Output is just files the site reads at
// runtime. Artifacts are committed off session branches to avoid merge noise.

import type { CollectionEntry } from "@nocms/core";
import { runManifest } from "./manifest";

export interface DeriveInput {
  entries: CollectionEntry[];
  /** locales in scope for i18n bundles */
  locales?: string[];
}

/** A produced file: path plus serialized contents. */
export interface DerivedArtifact {
  path: string;
  contents: string;
}

export interface DeriveJob {
  name: string;
  run(input: DeriveInput): DerivedArtifact[] | Promise<DerivedArtifact[]>;
}

export const manifestJob: DeriveJob = { name: "manifest", run: runManifest };

// Search index and i18n bundles depend on tool/format choices still being made,
// so they are not wired into deriveAll yet.
export const searchJob: DeriveJob = {
  name: "search",
  run: () => {
    throw new Error("not implemented: sharded search index (pending tool choice)");
  },
};

export const i18nJob: DeriveJob = {
  name: "i18n",
  run: () => {
    throw new Error("not implemented: per-locale bundles (pending format choice)");
  },
};

/** The jobs that run today. */
export const jobs: DeriveJob[] = [manifestJob];

export async function deriveAll(input: DeriveInput): Promise<DerivedArtifact[]> {
  const out: DerivedArtifact[] = [];
  for (const job of jobs) out.push(...(await job.run(input)));
  return out;
}

export { buildManifest, type Manifest, type ManifestEntry } from "./manifest";
