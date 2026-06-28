import type { ComponentChildren } from "preact";
import * as v from "valibot";
export declare const SURFACE_ROLES: readonly ["page", "surface", "subtle", "brand"];
export type SurfaceRole = (typeof SURFACE_ROLES)[number];
export declare const surfaceBg: Record<SurfaceRole, string>;
export declare const surfaceText: Record<SurfaceRole, string>;
/** Secondary text: the current foreground, dimmed — works on any surface. */
export declare const mutedInk = "text-current/65";
/** Hairline border tinted from the current foreground (full box / top edge). */
export declare const hairline = "border border-current/14";
export declare const hairlineTop = "border-t border-t-current/14";
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
    readonly sm: "py-lg";
    readonly md: "py-xl";
    readonly lg: "py-[calc(var(--space-xl)*1.5)]";
};
interface BandProps {
    background?: SurfaceRole;
    /** Vertical rhythm of the band; `lg` is heavier, for hero-weight sections. */
    size?: keyof typeof PAD;
    children?: ComponentChildren;
    class?: string;
    className?: string;
}
export declare function Band({ background, size, children, class: cls, className, }: BandProps): import("preact").JSX.Element;
export {};
