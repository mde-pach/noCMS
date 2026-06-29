import { type SiteConfig } from "@nocms/core";
export declare function collectCss(root: string): Promise<string | undefined>;
export declare function collectTailwindTheme(root: string): Promise<string | undefined>;
export declare function collectFavicon(publicDir: string, base: string): string;
export declare function collectHead(root: string, faviconHref: string, config: SiteConfig, base: string): Promise<string>;
export declare function collectEditor(root: string, base: string): Promise<{
    clientSrc: string;
    tokens?: string;
    schemas?: Record<string, unknown>;
} | undefined>;
export declare function runtimeConfigMarkup(config: SiteConfig, base: string): string;
