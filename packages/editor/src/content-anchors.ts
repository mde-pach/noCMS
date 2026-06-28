// Tag the live canvas DOM with `data-nocms-path` so a click on rendered content resolves to the
// exact prop leaf that produced it — e.g. a feature card's heading → `items.2.title`. The component
// stays untouched: we render a detached probe of it with each text leaf replaced by a unique token,
// then zip the probe's text nodes 1:1 against the live subtree (same renderer → identical structure)
// and tag where each token landed. Tokens we injected are matched, never the content itself, so two
// identical strings never collide; a transform that swallows a token just leaves that leaf untagged
// (the click falls back to selecting the block). If the structures don't line up — a slot/child
// component, a content-dependent branch — the whole component is skipped rather than mis-tagged.

import { type ComponentRegistry, controlsOf } from "@nocms/components";
import { type ControlDescriptor, contentPathsFromControls } from "@nocms/core";
import { sentinelFor } from "@nocms/renderer";
import { type ComponentType, h, render } from "preact";
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
