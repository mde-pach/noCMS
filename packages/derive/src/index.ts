// The batch tier: precompute features from the whole corpus in Actions —
// search, i18n, manifests, feeds. Output is just files the site reads at
// runtime. Artifacts are committed off session branches to avoid merge noise.

import type { CollectionEntry } from "@nocms/core";

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
  run(input: DeriveInput): Promise<DerivedArtifact[]>;
}

export const searchJob: DeriveJob = {
  name: "search",
  run: () => {
    throw new Error("not implemented: build a sharded search index");
  },
};

export const i18nJob: DeriveJob = {
  name: "i18n",
  run: () => {
    throw new Error("not implemented: emit per-locale bundles");
  },
};

export const manifestJob: DeriveJob = {
  name: "manifest",
  run: () => {
    throw new Error("not implemented: emit manifest/taxonomies/feeds");
  },
};

export const jobs: DeriveJob[] = [searchJob, i18nJob, manifestJob];

export async function deriveAll(input: DeriveInput): Promise<DerivedArtifact[]> {
  const out: DerivedArtifact[] = [];
  for (const job of jobs) out.push(...(await job.run(input)));
  return out;
}
