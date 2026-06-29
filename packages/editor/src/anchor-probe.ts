// Editor-only provenance for text that lives *inside* a component's props (array/object
// content), where `data-mdx-pos` can't reach: a default set in the component has no MDX
// source offset at all. Instead of tracking the value through the component (any transform
// drops the tag), we perturb the input and locate the output: substitute each text leaf with
// a unique, transform-stable token, render once, and find where each token landed. The
// component stays untouched and agnostic — it receives a plain string, just different
// characters — so a naively-written component produces the identical tree.

import type { VNode } from "preact";
import { renderToString } from "preact-render-to-string";

export interface AnchorInput {
  /** dotted path into the props value, e.g. `items.2.title` */
  path: string;
}

export interface Anchor {
  path: string;
  /** the token survived the render and was located in the output */
  found: boolean;
  /** name of the element wrapping the located token — diagnostic for the spike */
  enclosingTag?: string;
}

// Private-use-area framing. PUA codepoints have no case mapping, so `.toUpperCase()` leaves
// the token intact; the digits between survive case ops too. Uniqueness per index makes a
// hit unambiguous — we match a token we injected, never real content that could collide.
const OPEN = "\uE000";
const CLOSE = "\uE001";

export function sentinelFor(index: number): string {
  return `${OPEN}${index}${CLOSE}`;
}

/**
 * Probe where each content path renders. `render` turns props into the component's VNode —
 * the host builds it (`(p) => h(Component, p)`), keeping this module free of any schema or
 * registry. Every path is replaced with its token in one cloned props object and rendered
 * once; a token found in the output (even as a substring, after interpolation, or upper-cased)
 * pins that path to a DOM location. A token that's gone was computed away — that leaf simply
 * falls back to selecting its parent, never the wrong node.
 */
export function probeContentAnchors(
  render: (props: Record<string, unknown>) => VNode,
  props: Record<string, unknown>,
  paths: AnchorInput[],
): Anchor[] {
  const probe = structuredClone(props);
  const tokens = paths.map((p, index) => {
    setPath(probe, p.path, sentinelFor(index));
    return { path: p.path, token: sentinelFor(index) };
  });

  const html = renderToString(render(probe));

  return tokens.map(({ path, token }) => {
    const at = html.indexOf(token);
    return at === -1
      ? { path, found: false }
      : { path, found: true, enclosingTag: enclosingTag(html, at) };
  });
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

/** The tag name of the element immediately enclosing `index` in the HTML string. */
function enclosingTag(html: string, index: number): string | undefined {
  const open = html.lastIndexOf("<", index);
  if (open === -1) return undefined;
  const match = /^<([a-zA-Z][\w-]*)/.exec(html.slice(open, index));
  return match?.[1];
}
