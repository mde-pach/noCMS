import type { PrerenderedPage } from "./prerender";
export declare function routeToFilePath(routePath: string): string;
export declare function writePage(outDir: string, page: PrerenderedPage): Promise<void>;
export declare const ISLAND_CLIENT_FILE = "_nocms/islands.js";
export declare function writeIslandClient(root: string, outDir: string): Promise<void>;
export declare const EDITOR_CLIENT_FILE = "_nocms/editor.js";
export declare function writeEditorClient(root: string, outDir: string): Promise<void>;
export declare function editorClientBundlePath(root: string): string | undefined;
