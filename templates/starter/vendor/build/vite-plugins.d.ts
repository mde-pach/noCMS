import type { Plugin } from "vite";
/**
 * Exposes the island client entry as a virtual module so the dev server and the committed publish
 * bundle resolve the same entry. Importing it runs hydration on load (side-effecting `run()`).
 */
export declare const ISLAND_VIRTUAL_ID = "virtual:nocms-islands";
export declare function islandClientEntry(): string;
export declare function nocmsVitePlugins(): Plugin[];
