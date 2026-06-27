import { type CollectionEntry, contentPathToRoute, type RoutePath } from "@nocms/core";
import type { DerivedArtifact, DeriveInput } from "./index";

export interface ManifestEntry {
  collection: string;
  path: string;
  route: RoutePath;
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
      route: contentPathToRoute(e.path),
      data: e.data,
    })),
  };
}

export function runManifest(input: DeriveInput): DerivedArtifact[] {
  const manifest = buildManifest(input.entries);
  return [
    { path: "manifest.json", contents: `${JSON.stringify(manifest, null, 2)}\n` },
  ];
}
