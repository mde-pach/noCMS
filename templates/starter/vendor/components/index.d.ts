import type { ComponentType } from "preact";
type AnyComponent = ComponentType<Record<string, unknown>>;
/** Consumed by the renderer's ComponentMap and the editor's palette. */
export type ComponentRegistry = Record<string, {
    component: AnyComponent;
    /** needs client-side hydration as an island? */
    island?: boolean;
}>;
export declare const registry: ComponentRegistry;
export { Button, type ButtonProps } from "./primitives/Button";
export { Callout, type CalloutProps } from "./primitives/Callout";
export { Hero, type HeroProps } from "./primitives/Hero";
