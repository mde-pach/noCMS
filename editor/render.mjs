/**
 * The one renderer. The editor calls this; the build calls the same section modules
 * through Astro. Same compiler, same options, same components — so the preview and
 * the published page cannot disagree.
 */
import { experimental_AstroContainer } from 'astro/container';
import { componentFor, isSection } from '../src/lib/registry.mjs';
import { allCss } from '/@nocms/css';

let containerPromise;

/**
 * Framework renderers are registered from what the installed section packs declare,
 * never hardcoded — otherwise a fourth component library is a core change.
 * ORDER MATTERS: React's check() throws on foreign object components, so it goes last.
 */
async function getContainer() {
  containerPromise ??= (async () => {
    const container = await experimental_AstroContainer.create();
    const renderers = await import('./renderers.mjs').then((m) => m.renderers).catch(() => []);
    for (const r of renderers) container.addServerRenderer({ name: r.name, renderer: r.server });
    for (const r of renderers) {
      if (r.client) container.addClientRenderer({ name: r.name, entrypoint: r.client });
    }
    return container;
  })();
  return containerPromise;
}

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);

function propValues(props) {
  const out = {};
  for (const [name, p] of Object.entries(props)) {
    if (name === 'slot') continue;
    if (p.kind === 'text' || p.kind === 'data') out[name] = p.value;
    else if (p.kind === 'code') out[name] = undefined; // set in code; not previewable
    else out[name] = p.value;
  }
  return out;
}

function escapeText(s) { return String(s); }

async function renderNode(node, index, path, imports) {
  if (node.kind === 'other') {
    if (node.type === 'comment') return `<!--${node.value}-->`;
    if (node.type === 'expression') return '';   // evaluated at build; not in preview
    return escapeText(node.value);
  }

  const here = [...path, index];
  const known = node.isSection ? componentFor(node.name, imports) : null;

  if (!known) {
    // Plain HTML passes through unchanged — it is structure the editor does not own.
    const attrs = Object.entries(node.props)
      .filter(([, p]) => p.kind !== 'code')
      .map(([k, p]) => `${k}="${p.value}"`).join(' ');
    const open = `<${node.name}${attrs ? ' ' + attrs : ''}`;
    if (VOID.has(node.name) || (node.selfClosing && !node.children.length)) return open + ' />';
    const kids = await renderChildren(node.children, here, imports);
    return `${open}>${kids}</${node.name}>`;
  }

  const container = await getContainer();
  const slots = {};
  for (const [i, child] of node.children.entries()) {
    const slotName = child.props?.slot?.value ?? 'default';
    slots[slotName] = (slots[slotName] ?? '') + await renderNode(child, i, here, imports);
  }
  const html = await container.renderToString(known.component, {
    props: propValues(node.props),
    slots,
  });
  // Only sections are selectable. A layout renders so the canvas is faithful, but
  // wrapping a whole document in a marker div would be nonsense.
  if (!isSection(node.name, imports)) return html;
  // The marker is how the overlay maps a DOM rect back to a node in the tree.
  return `<div data-nocms-path="${here.join('.')}" style="display:contents">${html}</div>`;
}

async function renderChildren(nodes, path, imports) {
  const parts = [];
  for (const [i, n] of nodes.entries()) parts.push(await renderNode(n, i, path, imports));
  return parts.join('');
}

export async function renderTree(body, imports = {}) {
  return renderChildren(body, [], imports);
}

/** Scoped section CSS, collected at build time by the compiler plugin. */
export function sectionCss() { return allCss(); }
