// The island client entry: the only client JS a published noCMS site ships, and only on pages
// that contain an island. It builds the component map from the curated registry and hands it
// to the one renderer's `hydrateIslands`, which finds each prerender marker and attaches the
// same component with Preact `hydrate` — never a second renderer. Bundled to a self-contained
// browser ESM (preact inlined) at vendor time and committed, so a fork serves it verbatim.

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
