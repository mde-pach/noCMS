import type { ComponentChildren } from "preact";
export interface BadgeProps {
    variant?: "neutral" | "new" | "success" | "warn";
    children?: ComponentChildren;
}
export declare function Badge({ variant, children }: BadgeProps): import("preact").JSX.Element;
