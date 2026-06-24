import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/**
 * The island client entry, exposed as a virtual module so a Vite-based dev server and the
 * committed publish bundle resolve the *same* entry — one island runtime, never a divergent
 * client tree. Importing it runs hydration on load (it has the side-effecting `run()`).
 */
export const ISLAND_VIRTUAL_ID = "virtual:nocms-islands";

const RESOLVED_PREFIX = "\0";

/** Absolute path to the island client entry source, resolved next to this module. */
export function islandClientEntry(): string {
  return fileURLToPath(new URL("./island-client.ts", import.meta.url));
}

/** Re-exports the real island client entry; the bundler inlines it from here. */
function islandVirtualModule(): string {
  return `export * from ${JSON.stringify(islandClientEntry())};\n`;
}

function islandClientPlugin(): Plugin {
  const resolvedId = RESOLVED_PREFIX + ISLAND_VIRTUAL_ID;
  return {
    name: "nocms:island-client",
    resolveId(id) {
      return id === ISLAND_VIRTUAL_ID ? resolvedId : undefined;
    },
    load(id) {
      return id === resolvedId ? islandVirtualModule() : undefined;
    },
  };
}

/** MDX, image optimization, sitemap/RSS, and island-hydration plugins. */
export function nocmsVitePlugins(): Plugin[] {
  return [islandClientPlugin()];
}
