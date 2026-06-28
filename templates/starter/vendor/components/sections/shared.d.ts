import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const SURFACE_ROLES: readonly ["page", "surface", "subtle", "brand"];
export type SurfaceRole = (typeof SURFACE_ROLES)[number];
export declare const surfaceFor: Record<SurfaceRole, string>;
export declare const onSurfaceFor: Record<SurfaceRole, string>;
/** Secondary text: the current foreground, dimmed — works on any surface. */
export declare const mutedInk = "color-mix(in srgb, currentColor 65%, transparent)";
/** Hairline border tinted from the current foreground. */
export declare const hairline = "1px solid color-mix(in srgb, currentColor 14%, transparent)";
export declare const surfaceField: (role: SurfaceRole) => v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
    readonly control: "color";
}>]>, "page" | "surface" | "subtle" | "brand">;
export declare const richText: () => v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "richtext";
}>]>;
export declare const optionalRichText: (fallback?: string) => v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "richtext";
}>]>, string>;
export declare const linkField: (href?: string) => v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "url";
}>]>, string>;
export declare const imageField: () => v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "image";
}>]>, undefined>;
declare const PAD: {
    readonly sm: "var(--space-lg)";
    readonly md: "var(--space-xl)";
    readonly lg: "var(--space-xl)";
};
interface BandProps {
    background?: SurfaceRole;
    /** Vertical rhythm of the band; `lg` is heavier, for hero-weight sections. */
    size?: keyof typeof PAD;
    children?: ComponentChildren;
}
export declare function Band({ background, size, children }: BandProps): import("preact").JSX.Element;
export {};
