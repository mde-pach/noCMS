/**
 * The one renderer.
 *
 * The whole page tree is rendered in a SINGLE container pass, as one synthetic Astro
 * component — not component-by-component with the strings stitched together. That
 * matters: rendering each component in isolation and concatenating loses slot content
 * for framework components, because a React component needs `children`, not an HTML
 * string. Rendering the tree the way a real page renders it makes every framework's
 * children, slots and context behave identically to the build, structurally.
 */
import { experimental_AstroContainer } from "astro/container";
import {
  createComponent,
  markHTMLString,
  render,
  renderComponent,
} from "astro/runtime/server/index.js";
import { allCss } from "/@nocms/css";
import { componentFor, isAddressable } from "../src/lib/registry.mjs";
import { roleOf } from "../src/lib/roles.mjs";

let containerPromise;

async function getContainer() {
  containerPromise ??= (async () => {
    const container = await experimental_AstroContainer.create();
    const { renderers } = await import("./renderers.mjs").catch(() => ({
      renderers: [],
    }));
    // Server renderers first, then client — the container requires that order.
    for (const r of renderers)
      container.addServerRenderer({ name: r.name, renderer: r.server });
    for (const r of renderers) {
      if (r.client) container.addClientRenderer({ name: r.name, entrypoint: r.client });
    }
    return container;
  })();
  return containerPromise;
}

const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const layoutLike = (known) => Boolean(known?.isLayout);

function propValues(props) {
  const out = {};
  for (const [name, p] of Object.entries(props)) {
    if (name === "slot") continue;
    if (p.kind === "code") continue; // set in code; not previewable
    out[name] = p.value;
  }
  return out;
}

function attrString(props) {
  return Object.entries(props)
    .filter(([, p]) => p.kind !== "code")
    .map(([k, p]) => ` ${k}="${String(p.value).replace(/"/g, "&quot;")}"`)
    .join("");
}

function renderNodes(result, nodes, imports, path) {
  return nodes.map((node, i) => renderNode(result, node, imports, [...path, i]));
}

function renderNode(result, node, imports, path) {
  if (node.kind === "other") {
    if (node.type === "comment") return markHTMLString(`<!--${node.value}-->`);
    if (node.type === "expression") return ""; // evaluated at build; not previewable
    // Text that lives in the page tree is editable where it sits.
    //
    // The marker is a plain inline span, NOT display:contents. A display:contents
    // element generates no box, so it cannot be hit-tested or hold a caret — it reports
    // isContentEditable true while being impossible to click into. An inline span is
    // layout-neutral (bare text already forms an inline box) and focusable.
    //
    // The marker exists only in the editor; the parity gate strips it before comparing.
    if (node.value.trim() === "") return node.value;
    return render`${markHTMLString(`<span data-nocms-text="${path.join(".")}">`)}${node.value}${markHTMLString("</span>")}`;
  }

  const known = node.isComponent ? componentFor(node.name, imports) : null;

  if (!known) {
    // Plain HTML passes through: it is structure the editor does not own.
    const open = `<${node.name}${attrString(node.props)}`;
    if (VOID.has(node.name) || (node.selfClosing && !node.children.length)) {
      return markHTMLString(`${open} />`);
    }
    return render`${markHTMLString(`${open}>`)}${renderNodes(result, node.children, imports, path)}${markHTMLString(`</${node.name}>`)}`;
  }

  // Children become slot functions, exactly as the compiler emits for a real page.
  const slots = {};
  for (const [i, child] of node.children.entries()) {
    const name = child.props?.slot?.value ?? "default";
    if (!slots[name]) slots[name] = [];
    slots[name].push(renderNode(result, child, imports, [...path, i]));
  }
  const slotFns = Object.fromEntries(
    Object.entries(slots).map(([name, parts]) => [name, () => render`${parts}`]),
  );

  const element = renderComponent(
    result,
    node.name,
    known.component,
    propValues(node.props),
    slotFns,
  );

  // A layout owns the document; wrapping it in a marker would be nonsense.
  if (!isAddressable(node.name, imports) || layoutLike(known)) return element;

  const marker = `<div data-nocms-path="${path.join(".")}" data-nocms-role="${roleOf(known)}" style="display:contents">`;
  return render`${markHTMLString(marker)}${element}${markHTMLString("</div>")}`;
}

/** One component for the whole tree, so one container pass renders the page. */
const TreeComponent = createComponent(
  (result, props) => render`${renderNodes(result, props.nodes, props.imports, [])}`,
);

export async function renderTree(body, imports = {}) {
  const container = await getContainer();
  return container.renderToString(TreeComponent, { props: { nodes: body, imports } });
}

/** Scoped component CSS, collected at build time by the compiler plugin. */
export function sectionCss() {
  return allCss();
}
