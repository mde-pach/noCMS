// Tag the live canvas DOM with `data-nocms-path` so a click on rendered content resolves to the
// exact prop leaf that produced it — e.g. a feature card's heading → `items.2.title`. The component
// stays untouched: we render a detached probe of it with each text leaf replaced by a unique token,
// then zip the probe's text nodes 1:1 against the live subtree (same renderer → identical structure)
// and tag where each token landed. Tokens we injected are matched, never the content itself, so two
// identical strings never collide; a transform that swallows a token just leaves that leaf untagged
// (the click falls back to selecting the block). If the structures don't line up — a slot/child
// component, a content-dependent branch — the whole component is skipped rather than mis-tagged.

import { type ComponentRegistry, controlsOf } from "@nocms/components";
import {
  type ControlDescriptor,
  contentPathsFromControls,
  enumerateItemPaths,
  type ItemPath,
} from "@nocms/controls";
import { type ComponentType, h, render } from "preact";
import { sentinelFor } from "./anchor-probe.js";
import {
  getProp,
  getStructuredProp,
  isJsxElement,
  type JsxElement,
} from "./jsx-attributes.js";
import type { MdxDocument } from "./mdx-document.js";
import { nodeAtOffset } from "./position.js";

const POS_ATTR = "data-mdx-pos";
const PATH_ATTR = "nocmsPath";
const ITEM_ATTR = "nocmsItem";

/** The deepest element that encloses all of `els` — the common ancestor. With the leaves of one
 *  array item (all `tiers.1.*`), this resolves to that item's card, derived purely from the leaf
 *  tags the probe already placed. */
function commonAncestor(els: Element[]): Element | undefined {
  if (els.length === 0) return undefined;
  const chain = (el: Element): Element[] => {
    const out: Element[] = [];
    for (let n: Element | null = el; n; n = n.parentElement) out.unshift(n);
    return out;
  };
  const chains = els.map(chain);
  const first = chains[0] as Element[];
  let common: Element | undefined;
  for (let depth = 0; depth < first.length; depth++) {
    const node = first[depth];
    if (chains.every((c) => c[depth] === node)) common = node;
    else break;
  }
  return common;
}

/** The child of `container` whose subtree holds `descendant` — i.e. the element just below the
 *  container on the path down to the leaf. The list-item element for a leaf, regardless of how deep
 *  the leaf sits inside it. */
function childOfContainer(
  container: Element,
  descendant: Element,
): Element | undefined {
  let cur: Element | null = descendant;
  while (cur && cur.parentElement && cur.parentElement !== container) {
    cur = cur.parentElement;
  }
  return cur?.parentElement === container ? cur : undefined;
}

/** Tag each array element with `data-nocms-item="key.index"` so the canvas can select and drag it.
 *  Works per *array*, not per item: the array's list container is the common ancestor of all its
 *  items' leaves, and each item is the container child holding that item's leaf(s). This finds the
 *  real card/row for an object item *and* the `<li>` for a single-leaf string item (whose own
 *  common ancestor would just be the text node), and it nests — a tier's `features` list sits inside
 *  the tier card, each tagged independently. */
function tagItems(
  liveEl: Element,
  controls: ControlDescriptor[],
  props: Record<string, unknown>,
): void {
  const byArray = new Map<string, ItemPath[]>();
  for (const item of enumerateItemPaths(controls, props)) {
    const group = byArray.get(item.key);
    if (group) group.push(item);
    else byArray.set(item.key, [item]);
  }

  for (const items of byArray.values()) {
    // An object item's leaves are `path.*`; a string item *is* the leaf `path` exactly.
    const leavesOf = (path: string): HTMLElement[] => {
      const exact = liveEl.querySelector<HTMLElement>(`[data-nocms-path="${path}"]`);
      const nested = [
        ...liveEl.querySelectorAll<HTMLElement>(`[data-nocms-path^="${path}."]`),
      ];
      return exact ? [exact, ...nested] : nested;
    };
    const perItem = items
      .map((item) => ({ path: item.path, leaves: leavesOf(item.path) }))
      .filter((entry) => entry.leaves.length > 0);
    const container = commonAncestor(perItem.flatMap((entry) => entry.leaves));
    if (!container) continue;
    for (const { path, leaves } of perItem) {
      const el = leaves[0] && childOfContainer(container, leaves[0]);
      if (el instanceof HTMLElement && el !== liveEl) el.dataset[ITEM_ATTR] = path;
    }
  }
}

/** The props a component renders with: stored attributes where present, else schema defaults —
 *  the same resolution the props panel uses, so the probe render matches the live one. */
function resolveProps(
  node: JsxElement,
  controls: ControlDescriptor[],
): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const control of controls) {
    if (control.kind === "group" || control.kind === "list") {
      const stored = getStructuredProp(node, control.key);
      props[control.key] =
        stored ?? control.default ?? (control.kind === "list" ? [] : {});
    } else {
      const value = getProp(node, control.key);
      props[control.key] = value !== undefined ? value : control.default;
    }
  }
  return props;
}

function setPath(root: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split(".");
  let cur: Record<string, unknown> = root;
  for (let i = 0; i < keys.length - 1; i++) {
    const next = cur[keys[i] as string];
    if (!next || typeof next !== "object") return;
    cur = next as Record<string, unknown>;
  }
  cur[keys[keys.length - 1] as string] = value;
}

function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

function anchorOne(
  liveEl: Element,
  component: ComponentType<Record<string, unknown>>,
  node: JsxElement,
  controls: ControlDescriptor[],
): void {
  const props = resolveProps(node, controls);
  const paths = contentPathsFromControls(controls, props);
  if (paths.length === 0) return;

  const probeProps = structuredClone(props);
  const tokens = paths.map((p, i) => {
    setPath(probeProps, p.path, sentinelFor(i));
    return sentinelFor(i);
  });

  const scratch = document.createElement("div");
  try {
    render(h(component, probeProps), scratch);
    const probe = textNodes(scratch);
    const live = textNodes(liveEl);
    // A length mismatch means the probe and the live render diverged structurally; tagging by
    // index would be wrong, so skip — the block stays selectable, just not leaf-addressable.
    if (probe.length === live.length) {
      for (let i = 0; i < probe.length; i++) {
        const text = probe[i]?.nodeValue ?? "";
        const hit = tokens.findIndex((t) => text.includes(t));
        if (hit !== -1) {
          const parent = live[i]?.parentElement;
          if (parent) parent.dataset[PATH_ATTR] = paths[hit]?.path;
        }
      }
      // Leaves are now tagged; group them into their array-item cards.
      tagItems(liveEl, controls, props);
    }
  } finally {
    render(null, scratch);
  }
}

/**
 * Tag every registered component on the canvas with the content paths of its text leaves.
 * Runs after each canvas paint; the paint wiped any prior tags by re-rendering, and we clear
 * leftovers defensively in case preact reused an element across renders.
 */
export function anchorComponents(
  content: HTMLElement,
  doc: MdxDocument,
  components: ComponentRegistry,
): void {
  for (const tagged of content.querySelectorAll<HTMLElement>("[data-nocms-path]")) {
    delete tagged.dataset[PATH_ATTR];
  }
  for (const tagged of content.querySelectorAll<HTMLElement>("[data-nocms-item]")) {
    delete tagged.dataset[ITEM_ATTR];
  }
  for (const el of content.querySelectorAll(`[${POS_ATTR}]`)) {
    const offset = Number(el.getAttribute(POS_ATTR));
    if (Number.isNaN(offset)) continue;
    const node = nodeAtOffset(doc, offset).findLast(isJsxElement);
    if (!node || node.position?.start.offset !== offset) continue;
    if (!node.name) continue;
    const def = components[node.name];
    if (!def) continue;
    const component = def.component as ComponentType<Record<string, unknown>>;
    anchorOne(el, component, node, controlsOf(def));
  }
}
