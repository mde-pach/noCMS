import type { Plugin } from "vite";
/**
 * The island client entry, exposed as a virtual module so a Vite-based dev server and the
 * committed publish bundle resolve the *same* entry — one island runtime, never a divergent
 * client tree. Importing it runs hydration on load (it has the side-effecting `run()`).
 */
export declare const ISLAND_VIRTUAL_ID = "virtual:nocms-islands";
/** Absolute path to the island client entry source, resolved next to this module. */
export declare function islandClientEntry(): string;
/** MDX, image optimization, sitemap/RSS, and island-hydration plugins. */
export declare function nocmsVitePlugins(): Plugin[];
