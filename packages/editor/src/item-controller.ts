// Item-level resolution: an "item" is one element of a component's object-array prop (a pricing
// tier, a feature, a nav link). These helpers resolve an item to its document address, its backing
// array, its label, and its drop targets — all pure reads over the document + registry, with no
// editor render-state. The shell owns selection/drag (the mutating side) and calls in here.

import { type ComponentRegistry, controlsOf } from "@nocms/components";
import {
  arrayElementShape,
  type ControlDescriptor,
  enumerateItemPaths,
} from "@nocms/controls";
import type { Nodes, Parent } from "mdast";
import {
  type ItemSelection,
  type ItemTarget,
  parseItemPath,
} from "./item-selection.js";
import {
  getProp,
  getStructuredProp,
  isJsxElement,
  type JsxElement,
} from "./jsx-attributes.js";
import type { MdxDocument } from "./mdx-document.js";
import {
  type IndexPath,
  indexPathOf,
  nodeAtIndexPath,
  nodeAtOffset,
} from "./position.js";

export interface ItemControllerDeps {
  components: ComponentRegistry;
  getDoc: () => MdxDocument;
  /** the canvas element rendered for a document block path, scoped to the editing surface. */
  elementAtPath: (path: IndexPath) => Element | null;
}

export interface ItemController {
  /** Split a dotted item key into its top-level prop and the nested path under it. */
  splitItemKey(key: string): { topKey: string; rest: string[] };
  /** Walk `segs` into `root`, short-circuiting on a nullish hop. */
  navigate(root: unknown, segs: string[]): unknown;
  /** The resolved value of a node's top-level prop, falling back to the schema default. */
  resolvedTopValue(node: JsxElement, topKey: string): unknown;
  /** The array an item sits in, at any depth — for labelling and reordering. */
  resolvedArray(item: ItemSelection): unknown[] | undefined;
  /** The chip text for an item. */
  itemLabel(item: ItemSelection): string;
  /** Whether two item selections address the same item. */
  sameItem(a: ItemSelection, b: ItemSelection): boolean;
  /** Resolve the deepest `data-nocms-item` ancestor of `el` to a document-addressed selection. */
  itemAt(el: Element): ItemSelection | undefined;
  /** The canvas element of an item's card. */
  itemElement(item: ItemSelection): Element | null;
  /** Drop targets for an item drag: its own array plus every same-shaped array in the document. */
  itemTargets(source: ItemSelection): ItemTarget[];
}

function childrenOf(node: Nodes | undefined): Nodes[] {
  return node && "children" in node ? (node as Parent).children : [];
}

// A node's props the way the canvas renders them: stored attributes where present, else schema
// defaults — the resolution the props panel and content-anchor probe also use.
function resolveProps(
  node: JsxElement,
  controls: ControlDescriptor[],
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const control of controls) {
    if (control.kind === "group" || control.kind === "list") {
      props[control.key] =
        getStructuredProp(node, control.key) ??
        control.default ??
        (control.kind === "list" ? [] : {});
    } else {
      const v = getProp(node, control.key);
      props[control.key] = v !== undefined ? v : control.default;
    }
  }
  return props;
}

export function createItemController(deps: ItemControllerDeps): ItemController {
  const { components, getDoc, elementAtPath } = deps;

  // An item's key is a dotted path; it is reordered by rewriting its *top-level* prop (the first
  // segment) with the nested array spliced, since `setStructuredProp` writes whole attributes. A
  // nested feature `tiers.0.features.2` rewrites `tiers`; a top-level `tiers.1` rewrites `tiers`.
  const splitItemKey = (key: string): { topKey: string; rest: string[] } => {
    const segs = key.split(".");
    return { topKey: segs[0] ?? key, rest: segs.slice(1) };
  };
  const navigate = (root: unknown, segs: string[]): unknown =>
    segs.reduce<unknown>(
      (cur, s) => (cur == null ? undefined : (cur as Record<string, unknown>)[s]),
      root,
    );

  // The resolved value of a node's top-level prop, falling back to the schema default when the prop
  // isn't stored — a section often renders its seed array with no attribute, and reading only stored
  // attributes would miss it (a reorder would silently no-op).
  function resolvedTopValue(node: JsxElement, topKey: string): unknown {
    const stored = getStructuredProp(node, topKey);
    if (stored !== undefined) return stored;
    const def = node.name ? components[node.name] : undefined;
    return def ? controlsOf(def).find((c) => c.key === topKey)?.default : undefined;
  }

  function resolvedTop(item: ItemSelection): unknown {
    const node = nodeAtIndexPath(getDoc(), item.component);
    if (!node || !isJsxElement(node)) return undefined;
    return resolvedTopValue(node, splitItemKey(item.key).topKey);
  }

  function resolvedArray(item: ItemSelection): unknown[] | undefined {
    const arr = navigate(resolvedTop(item), splitItemKey(item.key).rest);
    return Array.isArray(arr) ? arr : undefined;
  }

  // Every component instance in the document, with its block path — for finding drop targets.
  function forEachComponent(cb: (node: JsxElement, path: IndexPath) => void): void {
    const walk = (node: Nodes, path: IndexPath): void => {
      childrenOf(node).forEach((child, i) => {
        const childPath = [...path, i];
        if (isJsxElement(child) && child.name) cb(child, childPath);
        walk(child, childPath);
      });
    };
    walk(getDoc(), []);
  }

  // Drop targets for an item drag: its own array (in-place reorder) plus every other array in the
  // document whose element is the *same shape* — so a feature can move to another tier's features or
  // another Pricing's, but never into a differently-shaped list.
  const itemTargets = (source: ItemSelection): ItemTarget[] => {
    const srcNode = nodeAtIndexPath(getDoc(), source.component);
    const srcDef =
      srcNode && isJsxElement(srcNode) && srcNode.name
        ? components[srcNode.name]
        : undefined;
    const srcShape = srcDef
      ? arrayElementShape(controlsOf(srcDef), source.key)
      : undefined;
    if (!srcShape) return [];
    const targets: ItemTarget[] = [];
    forEachComponent((node, path) => {
      const def = node.name ? components[node.name] : undefined;
      if (!def) return;
      const controls = controlsOf(def);
      const keys = new Set(
        enumerateItemPaths(controls, resolveProps(node, controls)).map((i) => i.key),
      );
      for (const key of keys) {
        if (arrayElementShape(controls, key) === srcShape)
          targets.push({ component: path, key });
      }
    });
    return targets;
  };

  // The chip text for an item: a string element verbatim (a feature), else its first non-empty text
  // field (a tier's name), else a positional fallback — legible without a declared label field.
  function itemLabel(item: ItemSelection): string {
    const val = resolvedArray(item)?.[item.index];
    if (typeof val === "string" && val.trim()) return val.trim().slice(0, 28);
    if (val && typeof val === "object") {
      for (const v of Object.values(val as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim()) return v.trim().slice(0, 28);
      }
    }
    return `${item.key} ${item.index + 1}`;
  }

  const sameItem = (a: ItemSelection, b: ItemSelection): boolean =>
    a.path === b.path && a.component.join() === b.component.join();

  // Array items — a card derived from an object-array prop, selectable and draggable on the canvas
  // (deepest-first: a card sits below its component). Detection is `data-nocms-item`, tagged by the
  // content-anchor pass; the item reorders within its own array prop, not the document tree.
  function itemAt(el: Element): ItemSelection | undefined {
    const itemEl = el.closest<HTMLElement>("[data-nocms-item]");
    const raw = itemEl?.dataset.nocmsItem;
    const parsed = raw ? parseItemPath(raw) : undefined;
    if (!itemEl || !raw || !parsed) return undefined;
    const compEl = itemEl.closest("[data-mdx-pos]");
    const offset = compEl ? Number(compEl.getAttribute("data-mdx-pos")) : Number.NaN;
    if (Number.isNaN(offset)) return undefined;
    const chain = nodeAtOffset(getDoc(), offset);
    const compNode = chain.findLast(
      (n) => isJsxElement(n) && n.position?.start.offset === offset,
    );
    const component = compNode ? indexPathOf(chain, compNode) : undefined;
    if (!component) return undefined;
    return { component, key: parsed.key, index: parsed.index, path: raw };
  }

  function itemElement(item: ItemSelection): Element | null {
    return (
      elementAtPath(item.component)?.querySelector(
        `[data-nocms-item="${item.path}"]`,
      ) ?? null
    );
  }

  return {
    splitItemKey,
    navigate,
    resolvedTopValue,
    resolvedArray,
    itemLabel,
    sameItem,
    itemAt,
    itemElement,
    itemTargets,
  };
}
