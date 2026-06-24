// The curated component library composed in the editor and rendered by
// @nocms/renderer. Props are plain typed Preact props so @nocms/props-discovery
// derives controls automatically. Plugin packs contribute more via the sandbox.

import type { ComponentType } from "preact";
import { Button } from "./primitives/Button";
import { Callout } from "./primitives/Callout";
import { Hero } from "./primitives/Hero";

type AnyComponent = ComponentType<Record<string, unknown>>;

/** Consumed by the renderer's ComponentMap and the editor's palette. */
export type ComponentRegistry = Record<
  string,
  {
    component: AnyComponent;
    /** needs client-side hydration as an island? */
    island?: boolean;
  }
>;

export const registry: ComponentRegistry = {
  Hero: { component: Hero as unknown as AnyComponent },
  Callout: { component: Callout as unknown as AnyComponent },
  Button: { component: Button as unknown as AnyComponent },
};

export { Button, type ButtonProps } from "./primitives/Button";
export { Callout, type CalloutProps } from "./primitives/Callout";
export { Hero, type HeroProps } from "./primitives/Hero";
