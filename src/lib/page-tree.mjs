/**
 * The page tree: the editor's runtime model of an .astro page.
 *
 * Two hard rules, both learned from spikes/container-in-browser:
 *
 *  1. LOSSLESS FOR CONTENT. Every node is modelled, including text, expressions and
 *     comments. A tree that models only components silently turns `<p>© {year}</p>`
 *     into `<p />` — saving destroys content. Nothing may ever be dropped.
 *
 *     Formatting is a weaker guarantee: the compiler drops some whitespace-only text
 *     and reports unreliable end offsets, so we cannot splice the original source.
 *     Serialization is therefore NORMALISING and IDEMPOTENT — the first save may
 *     reformat a hand-written page, and every save after that changes nothing.
 *     Sections are never rewritten by the editor; only pages are.
 *
 *  2. THREE PROP KINDS. `title="x"` is text the editor may edit. `items={[…]}` is an
 *     expression that evaluates to a pure literal, so it is *data* the editor may edit.
 *     `{year}` references code and is read-only. Without kind 2, every list prop — nav,
 *     feature grid, pricing table — would be uneditable.
 */
import { parse } from "@astrojs/compiler";

/**
 * In a browser the compiler is WASM and must be initialised once before use.
 * `initialize` exists only in the browser build, so it is imported dynamically —
 * a static import breaks the same module under Node, where none is needed.
 */
let ready;
function compilerReady() {
  if (typeof window === "undefined") return Promise.resolve();
  ready ??= import("@astrojs/compiler").then((m) =>
    m.initialize?.({ wasmURL: "/_nocms/astro.wasm" }),
  );
  return ready;
}

const TAG = new Set(["element", "component", "custom-element", "fragment"]);

/**
 * Is this expression source pure data, or does it reference code?
 * Purely lexical — nothing is ever evaluated, so a section pack cannot execute
 * code merely because someone opened the editor.
 */
export function literalValue(source) {
  const t = String(source).trim();
  if (!t) return { isLiteral: false };

  const stripped = t
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, "") // string literals
    .replace(/[A-Za-z_$][\w$]*\s*:/g, "") // object keys
    .replace(/\b(?:true|false|null)\b/g, ""); // data keywords

  // Anything left that looks like an identifier, call, template or assignment is code.
  if (/[A-Za-z_$`()=;]/.test(stripped)) return { isLiteral: false };

  try {
    const json = t
      .replace(/'((?:[^'\\]|\\.)*)'/g, (_, inner) => JSON.stringify(inner))
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      .replace(/,(\s*[}\]])/g, "$1");
    return { isLiteral: true, value: JSON.parse(json) };
  } catch {
    return { isLiteral: false };
  }
}

function toNode(n) {
  if (TAG.has(n.type)) {
    const props = {};
    for (const a of n.attributes || []) {
      if (a.kind === "quoted") props[a.name] = { kind: "text", value: a.value };
      else if (a.kind === "expression") {
        const lit = literalValue(a.value);
        props[a.name] = lit.isLiteral
          ? { kind: "data", value: lit.value, source: a.value }
          : { kind: "code", source: a.value };
      } else props[a.name] = { kind: "raw", attrKind: a.kind, value: a.value };
    }
    return {
      kind: "tag",
      type: n.type,
      name: n.name,
      isComponent: n.type === "component",
      props,
      selfClosing: !(n.children || []).length,
      children: (n.children || []).map(toNode),
    };
  }
  return {
    kind: "other",
    type: n.type,
    value: n.value ?? "",
    children: (n.children || []).map(toNode),
  };
}

/**
 * Which local identifier refers to which module. A page binds `<FeatureGrid />` to a
 * file through its own import, exactly as Astro resolves it — so the editor follows
 * the page's bindings rather than guessing from the tag name, and aliases just work.
 */
export function parseImports(frontmatter) {
  const map = {};
  if (!frontmatter) return map;
  const re = /import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"]/g;
  for (const [, name, from] of frontmatter.matchAll(re)) map[name] = from;
  return map;
}

/** Add an import if the page does not already bind this name. */
export function ensureImport(page, name, from) {
  const imports = parseImports(page.frontmatter);
  if (imports[name]) return false;
  const line = `import ${name} from '${from}';`;
  const body = page.frontmatter ?? "\n";
  const lines = body.split("\n");
  let last = -1;
  lines.forEach((l, i) => {
    if (/^\s*import\s/.test(l)) last = i;
  });
  lines.splice(last + 1, 0, line);
  page.frontmatter = lines.join("\n");
  return true;
}

export async function parsePage(source) {
  await compilerReady();
  const { ast } = await parse(source, { position: true });
  const kids = ast.children || [];
  const fm = kids.find((n) => n.type === "frontmatter");
  const frontmatter = fm ? fm.value : null;
  return {
    frontmatter,
    imports: parseImports(frontmatter),
    body: kids.filter((n) => n.type !== "frontmatter").map(toNode),
  };
}

function emitAttr(name, p) {
  switch (p.kind) {
    case "text":
      return `${name}="${p.value}"`;
    case "data":
      return `${name}={${p.source ?? JSON.stringify(p.value)}}`;
    case "code":
      return `${name}={${p.source}}`;
    default:
      return p.value === "" || p.value == null ? name : `${name}="${p.value}"`;
  }
}

function emit(n) {
  if (n.kind === "other") {
    if (n.type === "expression") return `{${(n.children || []).map(emit).join("")}}`;
    if (n.type === "comment") return `<!--${n.value}-->`;
    if (n.type === "doctype") return `<!${n.value}>`;
    return n.value;
  }
  const attrs = Object.entries(n.props)
    .map(([k, p]) => emitAttr(k, p))
    .join(" ");
  const open = `<${n.name}${attrs ? ` ${attrs}` : ""}`;
  if (n.selfClosing && !n.children.length) return `${open} />`;
  return `${open}>${n.children.map(emit).join("")}</${n.name}>`;
}

export function serializePage(page) {
  const fm = page.frontmatter === null ? "" : `---${page.frontmatter}---\n`;
  return fm + page.body.map(emit).join("");
}

/** Component instances at any depth. Plain HTML and text are structure, left alone. */
export function components(nodes) {
  const out = [];
  const walk = (list, path) =>
    list.forEach((n, i) => {
      const p = [...path, i];
      if (n.kind === "tag" && n.isComponent) out.push({ node: n, path: p });
      if (n.kind === "tag") walk(n.children, p);
    });
  walk(nodes, []);
  return out;
}

export function nodeAt(page, path) {
  let list = page.body,
    node = null;
  for (const i of path) {
    node = list[i];
    list = node.children || [];
  }
  return node;
}
