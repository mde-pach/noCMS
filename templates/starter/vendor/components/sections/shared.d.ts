import type { ComponentChildren } from "preact";
import type { SurfaceRole } from "../schema-builders";
export { imageField, imageProp, linkField, optionalRichText, optionalUrl, richText, SURFACE_ROLES, type SurfaceRole, surfaceField, urlProp, } from "../schema-builders";
export declare const surfaceBg: Record<SurfaceRole, string>;
export declare const surfaceText: Record<SurfaceRole, string>;
/** Secondary text: the current foreground, dimmed — works on any surface. */
export declare const mutedInk = "text-current/65";
/** Hairline border tinted from the current foreground (full box / top edge). */
export declare const hairline = "border border-current/14";
export declare const hairlineTop = "border-t border-t-current/14";
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
