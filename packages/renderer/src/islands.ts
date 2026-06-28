// An "island" is a component its registry entry marks `island: true`: at prerender its sub-tree
// is wrapped with a marker carrying name + JSON props, and the browser re-instantiates it with
// Preact `hydrate`. Detection, wrapping, and serialization stay pure so they unit-test without a
// browser; `hydrateIslands` is the only DOM-touching seam.

import { type ComponentType, h, hydrate, isValidElement, type VNode } from "preact";
import type { ComponentMap } from "./index.js";

export const ISLAND_ATTR = "data-island";
export const ISLAND_PROPS_ATTR = "data-island-props";

export interface IslandInstance {
  name: string;
  props: Record<string, unknown>;
}

export interface IslandManifest {
  islands: string[];
  instances: IslandInstance[];
}

/** Resolves a VNode's component type to its island name, or undefined for non-islands. */
export type IdentifyIsland = (
  type: unknown,
  props: Record<string, unknown>,
) => string | undefined;

// Children are reconstructed from the marker's SSR HTML at hydration, and functions/VNodes
// can't cross to the client as data; only plain, JSON-serializable props travel in the marker.
function pickSerializable(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === "children") continue;
    if (typeof value === "function") continue;
    if (isValidElement(value as VNode)) continue;
    out[key] = value;
  }
  return out;
}

export function serializeIslandProps(props: Record<string, unknown>): string {
  return JSON.stringify(pickSerializable(props));
}

export function deserializeIslandProps(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function walk(node: unknown, identify: IdentifyIsland, out: IslandInstance[]): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, identify, out);
    return;
  }
  if (!isValidElement(node as VNode)) return;
  const vnode = node as VNode<Record<string, unknown>>;
  const props = (vnode.props ?? {}) as Record<string, unknown>;
  const name = identify(vnode.type, props);
  if (name) out.push({ name, props: pickSerializable(props) });
  walk(props.children, identify, out);
}

/**
 * Collects every island sub-tree in a resolved VNode tree. The prerender path can't use it (an
 * MDX document renders lazily, so there's no resolved tree to walk before output); a consumer
 * that already holds a tree — the editor preview — can.
 */
export function collectIslands(tree: VNode, identify: IdentifyIsland): IslandManifest {
  const instances: IslandInstance[] = [];
  walk(tree, identify, instances);
  return { islands: [...new Set(instances.map((i) => i.name))], instances };
}

function islandHost(
  name: string,
  Component: ComponentType<Record<string, unknown>>,
): ComponentType<Record<string, unknown>> {
  // `display:contents` keeps the marker layout-neutral; it exists only to carry the name +
  // props and to be the container Preact hydrates the component back into.
  return (props) =>
    h(
      "div",
      {
        [ISLAND_ATTR]: name,
        [ISLAND_PROPS_ATTR]: serializeIslandProps(props),
        style: "display:contents",
      },
      h(Component, props),
    );
}

/**
 * Replaces each named island with a marker-emitting host, leaving other components untouched, so
 * island roots prerender with their marker while island-free output stays byte-for-byte the same.
 */
export function wrapIslandComponents(
  components: ComponentMap,
  islandNames: Iterable<string>,
): ComponentMap {
  const wrapped: ComponentMap = { ...components };
  for (const name of islandNames) {
    const original = components[name];
    if (original) wrapped[name] = islandHost(name, original);
  }
  return wrapped;
}

export function islandNamesFromHtml(html: string): string[] {
  const found = new Set<string>();
  const pattern = new RegExp(`${ISLAND_ATTR}="([^"]*)"`, "g");
  for (const match of html.matchAll(pattern)) {
    if (match[1]) found.add(match[1]);
  }
  return [...found];
}

/** Hydrates each island marker under `root` in place — the only DOM-touching island seam. */
export function hydrateIslands(
  components: ComponentMap,
  root: ParentNode = document,
): void {
  for (const el of Array.from(root.querySelectorAll(`[${ISLAND_ATTR}]`))) {
    const name = el.getAttribute(ISLAND_ATTR);
    const Component = name ? components[name] : undefined;
    if (!Component) continue;
    const props = deserializeIslandProps(el.getAttribute(ISLAND_PROPS_ATTR));
    hydrate(h(Component, props), el);
  }
}
