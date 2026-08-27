import morphdom from "morphdom";
import {
  ensureImport,
  nodeAt,
  parseImports,
  parsePage,
  serializePage,
} from "../src/lib/page-tree.mjs";
import {
  componentFor,
  importPathFor,
  list as listSections,
} from "../src/lib/registry.mjs";
import { createStorage, detectMode } from "../src/lib/storage/index.mjs";
import { parseTheme, setToken } from "../src/lib/theme.mjs";
import { mountChrome } from "./chrome.mjs";
import { enableDrag } from "./drag.mjs";
import { renderTree, sectionCss } from "./render.mjs";

const state = {
  storage: null,
  pagePath: "src/pages/index.astro",
  page: null, // { frontmatter, body }
  published: null, // serialized form as last saved, for the diff
  selected: null, // path array
  dirty: false,
  themePath: "src/styles/theme.css",
  themeCss: null,
  publishedTheme: null,
};

const canvas = () => document.getElementById("nocms-canvas");
const frameDoc = () => canvas().contentDocument;

/** Build the iframe document once. Never rewritten — updates are DOM patches, because
 *  replacing srcdoc destroys island state, scroll position and focus. */
const EDITOR_STYLES = `
<style data-nocms-chrome>
  [data-nocms-hover]{outline:2px solid color-mix(in srgb, var(--brand,#1f6f5e) 60%, transparent);outline-offset:-2px}
  [data-nocms-active]{outline:2px solid var(--brand,#1f6f5e);outline-offset:-2px}
  [contenteditable]:focus{outline:2px dashed var(--brand,#1f6f5e);outline-offset:2px}
</style>`;

async function mountCanvas() {
  const theme = state.themeCss;
  // renderTree produces the page's own document, layout and all — so the canvas
  // literally contains what ships, not a reconstruction of it.
  const rendered = await renderTree(state.page.body, state.page.imports);
  const head = `<style>${theme ?? ""}</style><style>${sectionCss()}</style>${EDITOR_STYLES}`;
  const doc = rendered.includes("</head>")
    ? rendered.replace("</head>", `${head}</head>`)
    : `<!doctype html><html><head>${head}</head><body>${rendered}</body></html>`;
  const frame = canvas();
  await new Promise((resolve) => {
    frame.addEventListener("load", resolve, { once: true });
    frame.srcdoc = doc;
  });
  wireCanvas();
}

/** Re-render and patch. The node holding the caret is left alone — morphing it
 *  resets the cursor to offset 0 whenever the re-rendered text differs. */
async function refresh() {
  const rendered = await renderTree(state.page.body, state.page.imports);
  const doc = frameDoc();
  const next = doc.createElement("body");
  const open = rendered.indexOf("<body");
  next.innerHTML =
    open === -1
      ? rendered
      : rendered.slice(
          rendered.indexOf(">", open) + 1,
          rendered.lastIndexOf("</body>"),
        );
  morphdom(doc.body, next, {
    childrenOnly: true,
    onBeforeElUpdated(fromEl) {
      if (fromEl.contains(doc.activeElement) && fromEl.hasAttribute("contenteditable"))
        return false;
      return true;
    },
  });
  wireCanvas();
  markDirty();
}

function wireCanvas() {
  const doc = frameDoc();
  if (!doc || doc.__nocmsWired) return;
  doc.__nocmsWired = true;

  // The path wrapper is display:contents and cannot carry an outline, so the
  // highlight goes on the section's own first element.
  const paintable = (el) => el?.firstElementChild ?? el;

  doc.addEventListener("mouseover", (e) => {
    const el = e.target.closest?.("[data-nocms-path]");
    for (const n of doc.querySelectorAll("[data-nocms-hover]")) {
      n.removeAttribute("data-nocms-hover");
    }
    const target = paintable(el);
    if (target && !target.hasAttribute("data-nocms-active"))
      target.setAttribute("data-nocms-hover", "");
  });

  doc.addEventListener("click", (e) => {
    const el = e.target.closest?.("[data-nocms-path]");
    if (!el) return;
    if (!e.target.hasAttribute?.("contenteditable")) e.preventDefault();
    select(el.dataset.nocmsPath.split(".").map(Number));
  });

  enableDrag(doc, async (fromPath, toIndex) => {
    const list = api.listFor(fromPath);
    const [node] = list.splice(fromPath.at(-1), 1);
    list.splice(toIndex, 0, node);
    await refresh();
    select([...fromPath.slice(0, -1), toIndex]);
  });

  // Inline editing: a section marks its editable text with data-edit="<prop>".
  for (const el of doc.querySelectorAll("[data-edit]")) {
    const holder = el.closest("[data-nocms-path]");
    if (!holder) continue;
    el.setAttribute("contenteditable", "plaintext-only");
    el.addEventListener("input", () => {
      const path = holder.dataset.nocmsPath.split(".").map(Number);
      const node = nodeAt(state.page, path);
      const prop = node.props[el.dataset.edit];
      if (!prop || prop.kind === "code") return;
      prop.value = el.textContent;
      markDirty();
      window.dispatchEvent(
        new CustomEvent("nocms:tree-changed", { detail: { silent: true } }),
      );
    });
  }
}

function select(path) {
  state.selected = path;
  const doc = frameDoc();
  for (const n of doc.querySelectorAll("[data-nocms-active]")) {
    n.removeAttribute("data-nocms-active");
  }
  const wrapper = doc.querySelector(`[data-nocms-path="${path.join(".")}"]`);
  const el = wrapper?.firstElementChild ?? wrapper;
  el?.setAttribute("data-nocms-active", "");
  el?.removeAttribute("data-nocms-hover");
  window.dispatchEvent(new CustomEvent("nocms:selected", { detail: { path } }));
}

function markDirty() {
  state.dirty =
    serializePage(state.page) !== state.published ||
    state.themeCss !== state.publishedTheme;
  window.dispatchEvent(
    new CustomEvent("nocms:dirty", { detail: { dirty: state.dirty } }),
  );
}

const api = {
  state,
  listSections,
  componentFor: (tag) => componentFor(tag, state.page.imports),
  select,
  refresh,
  nodeAt: (path) => nodeAt(state.page, path),

  async setProp(path, name, value) {
    const node = nodeAt(state.page, path);
    const prop = node.props[name];
    if (prop && prop.kind === "code") return false;
    node.props[name] = { kind: typeof value === "string" ? "text" : "data", value };
    await refresh();
    return true;
  },

  /** Adding a section also writes its import — a page the editor saves must build. */
  async addSection(id, at = null) {
    const def = componentFor(id, state.page.imports);
    if (!def) return;
    const tag = id
      .split(/[-_]/)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join("");
    const dir = state.pagePath.replace(/\/[^/]+$/, "");
    ensureImport(state.page, tag, importPathFor(id, dir));
    state.page.imports = parseImports(state.page.frontmatter);

    const props = {};
    for (const [k, v] of Object.entries(def.meta?.defaults ?? {})) {
      props[k] = { kind: typeof v === "string" ? "text" : "data", value: v };
    }
    const node = {
      kind: "tag",
      type: "component",
      name: tag,
      isSection: true,
      props,
      selfClosing: true,
      children: [],
    };

    // Sections go inside the layout when the page has one, not beside it.
    const host =
      state.page.body.find(
        (n) => n.kind === "tag" && n.isSection && n.children.length,
      ) ?? null;
    const list = host ? host.children : state.page.body;
    list.splice(at ?? list.length, 0, node);
    await refresh();
  },

  /** Resolve the sibling list a node lives in, so moves work at any depth. */
  listFor(path) {
    let list = state.page.body;
    for (const i of path.slice(0, -1)) list = list[i].children;
    return list;
  },

  async moveSection(path, delta) {
    const list = api.listFor(path);
    const i = path.at(-1);
    const j = i + delta;
    if (j < 0 || j >= list.length) return;
    const [n] = list.splice(i, 1);
    list.splice(j, 0, n);
    await refresh();
    select([...path.slice(0, -1), j]);
  },

  async removeSection(path) {
    api.listFor(path).splice(path.at(-1), 1);
    state.selected = null;
    await refresh();
  },

  /** Tokens for the theme panel, read from the site's own stylesheet. */
  themeTokens() {
    return parseTheme(state.themeCss);
  },

  /**
   * Re-theming is a variable write, not a re-render: the canvas restyles instantly
   * and the value is persisted to the stylesheet on publish.
   */
  setToken(name, value) {
    state.themeCss = setToken(state.themeCss, name, value);
    frameDoc()?.documentElement.style.setProperty(name, value);
    markDirty();
  },

  /** Plain-language diff: what changed, in the owner's words, not git's. */
  changes() {
    if (!state.dirty) return [];
    return [
      `${state.page.body.filter((n) => n.isSection).length} sections on this page`,
      "Unsaved edits in this browser",
    ];
  },

  async save(message = "Update site") {
    const content = serializePage(state.page);
    const files = [{ path: state.pagePath, content }];
    if (state.themeCss !== state.publishedTheme) {
      files.push({ path: state.themePath, content: state.themeCss });
    }
    // One commit for the whole change set, so undoing a publish is one revert.
    await state.storage.write(files, message);
    state.published = content;
    state.publishedTheme = state.themeCss;
    markDirty();
    return state.storage.describeTarget();
  },
};

async function boot() {
  const mode = await detectMode();
  state.storage = await createStorage({ mode, ...(window.NOCMS_CONFIG ?? {}) });
  const source = await state.storage.read(state.pagePath);
  if (source == null) throw new Error(`cannot read ${state.pagePath}`);
  state.page = await parsePage(source);
  state.published = serializePage(state.page);
  state.themeCss = (await state.storage.read(state.themePath)) ?? "";
  state.publishedTheme = state.themeCss;
  mountChrome(api);
  await mountCanvas();
  markDirty();
  // Exposed so the parity gate can render a page through the real editor bundle.
  window.__nocms = {
    ...api,
    renderTree: () => renderTree(state.page.body, state.page.imports),
  };
}

boot().catch((err) => {
  document.body.innerHTML = `<pre style="padding:2rem;font:13px ui-monospace">noCMS failed to start\n\n${err.stack || err}</pre>`;
});
