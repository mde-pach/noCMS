import morphdom from "morphdom";
import { globalCss } from "/@nocms/styles";
import { describeChanges, describeThemeChanges } from "../src/lib/changes.mjs";
import {
  ensureImport,
  nodeAt,
  parseImports,
  parsePage,
  serializePage,
} from "../src/lib/page-tree.mjs";
import {
  blankPage,
  listPages,
  normaliseRoute,
  pathForRoute,
  relativePrefix,
} from "../src/lib/pages.mjs";
import {
  componentFor,
  importPathFor,
  list as listComponents,
  tagFor,
} from "../src/lib/registry.mjs";
import { roleOf, standsAlone } from "../src/lib/roles.mjs";
import { createStorage, detectMode } from "../src/lib/storage/index.mjs";
import { parseTheme, setToken } from "../src/lib/theme.mjs";
import { mountChrome } from "./chrome.mjs";
import { enableDrag } from "./drag.mjs";
import { prepareImage } from "./images.mjs";
import { nextStep, renderOnboarding } from "./onboarding.mjs";
import { renderTree, sectionCss } from "./render.mjs";
import {
  consumeRedirect,
  currentSession,
  signInWithToken,
  startSignIn,
} from "./sign-in.mjs";
import { renderSignIn } from "./sign-in-screen.mjs";

const state = {
  storage: null,
  pagePath: "src/pages/index.astro",
  page: null, // { frontmatter, body }
  published: null, // serialized form as last saved, for the diff
  publishedTree: null, // the tree as last saved, for the plain-language diff
  lastPublish: null, // { sha, files } so a publish can be undone
  selected: null, // path array
  dirty: false,
  pages: [],
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
  // Declared stylesheets first (a library's own CSS), then the theme the owner edits,
  // then scoped component styles — the same order the built page resolves them in.
  const head =
    `<style data-nocms-global>${globalCss}</style>` +
    `<style data-nocms-theme>${theme ?? ""}</style>` +
    `<style>${sectionCss()}</style>${EDITOR_STYLES}`;
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
  listComponents,
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
  async addComponent(id, at = null) {
    const def = componentFor(id, state.page.imports);
    if (!def) return;
    const tag = tagFor(id);
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
      isComponent: true,
      props,
      selfClosing: true,
      children: [],
    };

    // Where a component may go is decided by roles, not by type. A block goes on the
    // page; an inline goes into whatever container is selected, or the last one.
    const layoutHost =
      state.page.body.find(
        (n) => n.kind === "tag" && n.isComponent && n.children.length,
      ) ?? null;
    const pageList = layoutHost ? layoutHost.children : state.page.body;

    let list = pageList;
    if (!standsAlone(def)) {
      const selected = state.selected ? nodeAt(state.page, state.selected) : null;
      const container =
        (selected &&
        roleOf(componentFor(selected.name, state.page.imports)) === "container"
          ? selected
          : null) ??
        pageList.find(
          (n) =>
            n.kind === "tag" &&
            n.isComponent &&
            roleOf(componentFor(n.name, state.page.imports)) === "container",
        );
      if (container) list = container.children;
    }
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

  /**
   * Images are committed as soon as they are chosen, not held until publish: the
   * canvas needs a real URL to show, and a half-uploaded image is worse than a slow one.
   */
  async addImage(file) {
    const existing = await state.storage.list("public/media/").catch(() => []);
    const prepared = await prepareImage(file, existing);
    await state.storage.write(
      [{ path: prepared.path, content: prepared.content, encoding: "base64" }],
      `Add image ${prepared.src}`,
    );
    return prepared;
  },

  /** Kept so older callers and tests keep working. */
  addSection(id, at) {
    return api.addComponent(id, at);
  },

  /** Every page the editor may open, newest structure read from storage. */
  async loadPages() {
    const paths = await state.storage.list("src/pages/");
    state.pages = listPages(paths);
    return state.pages;
  },

  /** Switching pages discards nothing: unsaved work blocks the move. */
  async openPage(path) {
    if (state.dirty) return { blocked: true };
    const source = await state.storage.read(path);
    if (source == null) return { error: `cannot read ${path}` };
    state.pagePath = path;
    state.page = await parsePage(source);
    state.published = serializePage(state.page);
    state.publishedTree = await parsePage(state.published);
    state.selected = null;
    await mountCanvas();
    markDirty();
    window.dispatchEvent(new CustomEvent("nocms:page-opened", { detail: { path } }));
    return { ok: true };
  },

  /** A new page is a layout wrapping nothing; the owner fills it from the library. */
  async createPage(routeInput, title) {
    const route = normaliseRoute(routeInput);
    if (!route) return { error: "That URL is empty." };
    const path = pathForRoute(route);
    if (state.pages.some((p) => p.path === path))
      return { error: `${route} already exists.` };

    const content = blankPage(title || route.replace(/^\//, "")).replace(
      "../layouts/Site.astro",
      `${relativePrefix(path)}layouts/Site.astro`,
    );
    await state.storage.write([{ path, content }], `Add page ${route}`);
    await api.loadPages();
    await api.openPage(path);
    return { ok: true, route };
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

  /** What is about to be published, described as the page rather than as a file. */
  changes() {
    if (!state.dirty) return [];
    return [
      ...describeChanges(state.publishedTree, state.page),
      ...describeThemeChanges(state.publishedTheme, state.themeCss),
    ];
  },

  canUndo() {
    return Boolean(state.lastPublish && state.storage.undo);
  },

  /** Undo is a revert, not a rewrite: the version being undone stays in the history. */
  async undoPublish() {
    if (!api.canUndo()) return { error: "nothing to undo" };
    await state.storage.undo(state.lastPublish.sha);
    const source = await state.storage.read(state.pagePath);
    state.page = await parsePage(source ?? "");
    state.published = serializePage(state.page);
    state.publishedTree = await parsePage(state.published);
    state.lastPublish = null;
    await mountCanvas();
    markDirty();
    return { ok: true };
  },

  async save(message = "Update site") {
    const content = serializePage(state.page);
    const files = [{ path: state.pagePath, content }];
    if (state.themeCss !== state.publishedTheme) {
      files.push({ path: state.themePath, content: state.themeCss });
    }
    // One commit for the whole change set, so undoing a publish is one revert.
    const result = await state.storage.write(files, message);
    if (result?.sha)
      state.lastPublish = { sha: result.sha, files: files.map((f) => f.path) };
    state.published = content;
    state.publishedTree = await parsePage(content);
    state.publishedTheme = state.themeCss;
    markDirty();
    return state.storage.describeTarget();
  },
};

/**
 * Local mode needs no identity at all — the dev server is the backend, so a developer
 * never signs in. Only GitHub mode does.
 */
async function resolveSession(config) {
  const fromRedirect = await consumeRedirect(config);
  if (fromRedirect) return fromRedirect;
  return currentSession(config);
}

async function boot() {
  const mode = await detectMode();
  const config = window.NOCMS_CONFIG ?? {};

  let token;
  if (mode === "github") {
    const session = await resolveSession(config).catch((err) => {
      renderSignIn({
        config,
        error: err.message,
        onOAuth: () => startSignIn(config),
        onToken: (value) => {
          signInWithToken(value);
          window.location.reload();
        },
      });
      return undefined;
    });
    if (!session) {
      if (!document.querySelector(".signin")) {
        renderSignIn({
          config,
          onOAuth: () => startSignIn(config),
          onToken: (value) => {
            signInWithToken(value);
            window.location.reload();
          },
        });
      }
      return;
    }
    token = session.accessToken;
  }

  state.storage = await createStorage({ mode, token, ...config });

  // A site that is not set up yet gets the teaching path, not an error. Local mode is
  // already set up by definition — a developer running the dev server has all three.
  if (mode === "github") {
    const reachable = (await state.storage.read(state.pagePath)) != null;
    const step = nextStep({
      signedIn: true,
      hasRepo: reachable,
      hasAddress: reachable,
    });
    if (step) {
      renderOnboarding({
        state: { signedIn: true, hasRepo: reachable, hasAddress: reachable },
        onStep: () => window.location.reload(),
      });
      return;
    }
  }
  const source = await state.storage.read(state.pagePath);
  if (source == null) throw new Error(`cannot read ${state.pagePath}`);
  state.page = await parsePage(source);
  state.published = serializePage(state.page);
  state.publishedTree = await parsePage(state.published);
  state.themeCss = (await state.storage.read(state.themePath)) ?? "";
  state.publishedTheme = state.themeCss;
  await api.loadPages();
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
