import type { CollectionEntry } from "@nocms/core";
import type { DerivedArtifact, DeriveInput } from "./index";

export interface ManifestEntry {
  collection: string;
  path: string;
  data: Record<string, unknown>;
}

export interface Manifest {
  count: number;
  entries: ManifestEntry[];
}

export function buildManifest(entries: CollectionEntry[]): Manifest {
  return {
    count: entries.length,
    entries: entries.map((e) => ({
      collection: e.collection,
      path: e.path,
      data: e.data,
    })),
  };
}

/** Emit a single manifest.json the site can fetch at runtime. */
export function runManifest(input: DeriveInput): DerivedArtifact[] {
  const manifest = buildManifest(input.entries);
  return [
    { path: "manifest.json", contents: `${JSON.stringify(manifest, null, 2)}\n` },
  ];
}
