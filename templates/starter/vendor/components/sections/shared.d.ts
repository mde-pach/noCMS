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
/** A `color`-meta-typed surface-role control, defaulting to `role`. */
export declare const surfaceField: (role: SurfaceRole) => v.OptionalSchema<v.SchemaWithPipe<readonly [v.PicklistSchema<readonly ["page", "surface", "subtle", "brand"], undefined>, v.MetadataAction<"page" | "surface" | "subtle" | "brand", {
    readonly control: "color";
}>]>, "page" | "surface" | "subtle" | "brand">;
/** A required inline-prose string control. */
export declare const richText: () => v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "richtext";
}>]>;
/** An optional inline-prose string control. */
export declare const optionalRichText: (fallback?: string) => v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "richtext";
}>]>, string>;
/** A link control (the `url` meta-type), defaulting to `href`. */
export declare const linkField: (href?: string) => v.OptionalSchema<v.SchemaWithPipe<readonly [v.StringSchema<undefined>, v.MetadataAction<string, {
    readonly control: "url";
}>]>, string>;
/** A media-picker control (the `image` meta-type). */
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
    /** vertical rhythm of the band; `lg` doubles `xl` for hero-weight sections. */
    size?: keyof typeof PAD;
    children?: ComponentChildren;
}
export declare function Band({ background, size, children }: BandProps): import("preact").JSX.Element;
export {};
