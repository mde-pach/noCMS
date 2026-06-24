// The curated component library composed in the editor and rendered by
// @nocms/renderer. Props are plain typed Preact props so @nocms/props-discovery
// derives controls automatically. Plugin packs contribute more via the sandbox.

import type { ComponentType } from "preact";

/** Consumed by the renderer's ComponentMap and the editor's palette. */
export type ComponentRegistry = Record<
  string,
  {
    component: ComponentType<Record<string, unknown>>;
    /** needs client-side hydration as an island? */
    island?: boolean;
  }
>;

export const registry: ComponentRegistry = {};
