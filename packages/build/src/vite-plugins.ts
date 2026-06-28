import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

/**
 * Exposes the island client entry as a virtual module so the dev server and the committed publish
 * bundle resolve the same entry. Importing it runs hydration on load (side-effecting `run()`).
 */
export const ISLAND_VIRTUAL_ID = "virtual:nocms-islands";

const RESOLVED_PREFIX = "\0";

export function islandClientEntry(): string {
  return fileURLToPath(new URL("./island-client.ts", import.meta.url));
}

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

export function nocmsVitePlugins(): Plugin[] {
  return [islandClientPlugin()];
}
