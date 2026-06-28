// Bundled to a self-contained browser ESM (preact inlined) at vendor time and committed, so a
// fork serves it verbatim. Hydrates the curated island components against the prerender markers.

import { registry } from "@nocms/components";
import { type ComponentMap, hydrateIslands } from "@nocms/renderer";

const components: ComponentMap = Object.fromEntries(
  Object.entries(registry)
    .filter(([, entry]) => entry.island)
    .map(([name, entry]) => [name, entry.component]),
);

export function run(root: ParentNode = document): void {
  hydrateIslands(components, root);
}

if (typeof document !== "undefined") run();
