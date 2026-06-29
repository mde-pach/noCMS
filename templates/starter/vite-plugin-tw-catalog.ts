import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCatalog } from "@nocms/style-controls/build";
import type { Plugin } from "vite";

// Serves the design-control catalog as a virtual module. The catalog itself is built by the
// headless @nocms/style-controls engine; this plugin only feeds it the site's real theme and caches
// the result, so the Style panel offers exactly the utilities the site's tokens generate — the same
// @theme the build and preview compile against.

const here = path.dirname(fileURLToPath(import.meta.url));
const VIRTUAL = "virtual:tw-catalog";

export function twCatalogPlugin(): Plugin {
  let cache: Promise<string> | undefined;
  return {
    name: "nocms-tw-catalog",
    resolveId(id) {
      if (id === VIRTUAL) return `\0${VIRTUAL}`;
    },
    load(id) {
      if (id !== `\0${VIRTUAL}`) return;
      if (!cache) {
        const tokens = readFileSync(path.resolve(here, "theme.tokens"), "utf8");
        cache = buildCatalog(tokens, here).then((cat) => {
          console.log(
            `[tw-catalog] ${cat.total} classes → ${cat.features.length} features`,
          );
          return `export default ${JSON.stringify(cat)};`;
        });
      }
      return cache;
    },
  };
}
