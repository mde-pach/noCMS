import type { ComponentChildren } from "preact";
export interface SectionProps {
    tone?: "default" | "muted" | "accent";
    padding?: "sm" | "md" | "lg";
    children?: ComponentChildren;
}
export declare function Section({ tone, padding, children }: SectionProps): import("preact").JSX.Element;
