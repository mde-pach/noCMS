// Island hydration lives in the site so it builds the component map from the site's composed
// registry — a fork's own island components hydrate too. The only client JS a published page
// ships, and only on pages with an island.

import { type ComponentMap, hydrateIslands } from "@nocms/renderer";
import { registry } from "./registry";

const components: ComponentMap = Object.fromEntries(
  Object.entries(registry)
    .filter(([, entry]) => entry.island)
    .map(([name, entry]) => [name, entry.component]),
);

if (typeof document !== "undefined") hydrateIslands(components, document);
