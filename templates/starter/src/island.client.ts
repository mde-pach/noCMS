// The site's island hydration client — the only client JS a published page ships, and
// only on pages with an island. It builds the component map from the site's composed
// registry and hands it to the one renderer's hydrateIslands, so a fork's own island
// components hydrate too. Bundled at vendor time (preact inlined) and served verbatim.

import { type ComponentMap, hydrateIslands } from "@nocms/renderer";
import { registry } from "./registry";

const components: ComponentMap = Object.fromEntries(
  Object.entries(registry)
    .filter(([, entry]) => entry.island)
    .map(([name, entry]) => [name, entry.component]),
);

if (typeof document !== "undefined") hydrateIslands(components, document);
