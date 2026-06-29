import type { Route } from "./prerender";
/** Non-empty and slash-terminated, so `${base}asset` always joins correctly. */
export declare function normalizeBase(base: string): string;
export declare function loadRoutes(contentDir: string): Promise<Route[]>;
