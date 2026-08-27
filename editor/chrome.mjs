import { groupTokens } from "../src/lib/theme.mjs";
import { enumOptions, listItemShape, uiMeta } from "./zod-ui.mjs";

/** The editor's own interface. Lives in the parent document, so its styles can never
 *  collide with the site's — that isolation is one of the reasons the canvas is an iframe. */

const CSS = `
  :root{--e-bg:#f4f5f3;--e-panel:#fff;--e-ink:#16201d;--e-muted:#5c6a66;--e-line:#dde2df;--e-accent:#1f6f5e;--e-warn:#8e620c}
  @media (prefers-color-scheme:dark){:root{--e-bg:#0e1211;--e-panel:#161b1a;--e-ink:#e7ebe9;--e-muted:#9aa8a3;--e-line:#262d2b;--e-accent:#54c3a6;--e-warn:#d8a441}}
  *{box-sizing:border-box}
  body{margin:0;height:100vh;display:grid;grid-template-rows:auto 1fr;background:var(--e-bg);color:var(--e-ink);
       font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
  header{display:flex;align-items:center;gap:16px;padding:10px 16px;background:var(--e-panel);border-bottom:1px solid var(--e-line)}
  header .brand{font-weight:600;letter-spacing:-.01em}
  header .mode{font:11px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--e-muted);
               border:1px solid var(--e-line);border-radius:99px;padding:3px 10px}
  header .spacer{flex:1}
  header select{font:inherit;padding:5px 8px;border:1px solid var(--e-line);border-radius:7px;
                background:var(--e-panel);color:var(--e-ink);max-width:220px}
  header #e-new-page{padding:5px 10px;line-height:1}
  button{font:inherit;border:1px solid var(--e-line);background:var(--e-panel);color:var(--e-ink);
         border-radius:7px;padding:6px 12px;cursor:pointer}
  button:hover{border-color:var(--e-accent)}
  button.primary{background:var(--e-accent);border-color:var(--e-accent);color:#fff}
  button.primary[disabled]{opacity:.45;cursor:default}
  button:focus-visible{outline:2px solid var(--e-accent);outline-offset:2px}
  main{display:grid;grid-template-columns:210px 1fr 290px;overflow:hidden}
  aside{background:var(--e-panel);overflow:auto;padding:14px}
  .tabs{display:flex;gap:4px;margin-bottom:12px}
  .tabs button{flex:1;padding:5px;font-size:12px}
  .tabs button[aria-selected="true"]{background:var(--e-accent);border-color:var(--e-accent);color:#fff}
  .item{border:1px solid var(--e-line);border-radius:8px;padding:10px;margin-bottom:8px;background:var(--e-bg)}
  .item header{display:flex;align-items:center;gap:6px;padding:0 0 8px;background:none;border:0}
  .item header strong{flex:1;font-size:12px;font-weight:600}
  .item header button{padding:2px 7px;font-size:11px;line-height:1.4}
  .add{width:100%;margin-top:4px}
  .swatch{display:flex;gap:8px;align-items:center}
  .swatch input[type=color]{width:34px;height:30px;padding:2px;flex:none;cursor:pointer}
  .swatch input[type=text]{flex:1;font:12px ui-monospace,monospace}
  .group{font:11px ui-monospace,monospace;letter-spacing:.09em;text-transform:uppercase;
         color:var(--e-muted);margin:14px 0 8px}
  .group:first-child{margin-top:0}
  .hint{font-size:12px;color:var(--e-muted);margin:0 0 12px}
  aside.right{border-left:1px solid var(--e-line)}
  aside.left{border-right:1px solid var(--e-line)}
  h2{font:11px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--e-muted);margin:0 0 10px}
  .lib button{display:block;width:100%;text-align:left;margin-bottom:6px}
  .lib small{display:block;color:var(--e-muted);font-size:12px}
  .canvas{overflow:auto;display:grid;place-items:start center;padding:20px}
  iframe{width:100%;max-width:1100px;height:calc(100vh - 120px);border:1px solid var(--e-line);
         border-radius:10px;background:#fff}
  .field{margin-bottom:14px}
  .field label{display:block;font-size:12px;color:var(--e-muted);margin-bottom:4px}
  .field input,.field textarea,.field select{width:100%;font:inherit;padding:6px 8px;border:1px solid var(--e-line);
        border-radius:6px;background:var(--e-bg);color:var(--e-ink)}
  .field textarea{min-height:70px;resize:vertical}
  .locked{font:12px ui-monospace,monospace;color:var(--e-warn);background:color-mix(in srgb,var(--e-warn) 12%,transparent);
          border:1px solid color-mix(in srgb,var(--e-warn) 35%,transparent);border-radius:6px;padding:6px 8px}
  .empty{color:var(--e-muted);font-size:13px}
  .row{display:flex;gap:6px;margin-bottom:12px}
  .row button{flex:1;padding:4px}
  .note{font-size:12px;color:var(--e-muted);border-top:1px solid var(--e-line);margin-top:14px;padding-top:12px}
`;

export function mountChrome(api) {
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.append(style);

  document.body.innerHTML = `
    <header>
      <span class="brand">noCMS</span>
      <select id="e-pages" title="Page"></select>
      <button id="e-new-page" title="Add a page">+</button>
      <span class="mode" id="e-mode"></span>
      <span class="spacer"></span>
      <span class="mode" id="e-status"></span>
      <button class="primary" id="e-save" disabled>Publish</button>
    </header>
    <main>
      <aside class="left"><h2>Sections</h2><div class="lib" id="e-lib"></div></aside>
      <div class="canvas"><iframe id="nocms-canvas" title="Page preview"></iframe></div>
      <aside class="right">
        <div class="tabs">
          <button id="e-tab-edit" aria-selected="true">Edit</button>
          <button id="e-tab-theme" aria-selected="false">Theme</button>
        </div>
        <div id="e-panel"><p class="empty">Click something on the page to edit it.</p></div>
      </aside>
    </main>`;

  const $ = (id) => document.getElementById(id);
  $("e-mode").textContent =
    api.state.storage.mode === "local" ? "local · working tree" : "github";

  const pages = $("e-pages");
  const paintPages = () => {
    pages.innerHTML = "";
    for (const page of api.state.pages) {
      const o = document.createElement("option");
      o.value = page.path;
      o.textContent = page.route;
      o.selected = page.path === api.state.pagePath;
      pages.append(o);
    }
  };
  paintPages();

  pages.onchange = async () => {
    const result = await api.openPage(pages.value);
    if (result.blocked) {
      $("e-status").textContent = "publish or discard first";
      paintPages();
    } else if (result.error) {
      $("e-status").textContent = result.error;
      paintPages();
    }
  };

  $("e-new-page").onclick = async () => {
    const route = prompt("URL for the new page, e.g. /about");
    if (!route) return;
    const result = await api.createPage(route);
    $("e-status").textContent = result.error ?? `created ${result.route}`;
    if (result.ok) paintPages();
  };

  window.addEventListener("nocms:page-opened", paintPages);

  const lib = $("e-lib");
  for (const section of api.listSections()) {
    const b = document.createElement("button");
    b.innerHTML = `${section.meta.name}<small>${section.meta.description ?? ""}</small>`;
    b.onclick = () => api.addSection(section.id);
    lib.append(b);
  }

  // In local mode a save lands in the working tree, which the dev server watches — so
  // the editor may reload underneath us. Carry the result across that reload.
  const STATUS_KEY = "nocms:last-status";
  const restored = sessionStorage.getItem(STATUS_KEY);
  if (restored) {
    $("e-status").textContent = restored;
    sessionStorage.removeItem(STATUS_KEY);
  }

  const save = $("e-save");
  save.onclick = async () => {
    save.disabled = true;
    $("e-status").textContent = "publishing…";
    try {
      const target = await api.save();
      const msg =
        api.state.storage.mode === "local"
          ? `written to ${target}`
          : `published to ${target}`;
      sessionStorage.setItem(STATUS_KEY, msg);
      $("e-status").textContent = msg;
    } catch (err) {
      $("e-status").textContent = `failed: ${err.message}`;
      save.disabled = false;
    }
  };

  window.addEventListener("nocms:dirty", (e) => {
    save.disabled = !e.detail.dirty;
    if (e.detail.dirty) $("e-status").textContent = "unsaved changes";
  });

  let tab = "edit";
  const setTab = (next) => {
    tab = next;
    $("e-tab-edit").setAttribute("aria-selected", String(next === "edit"));
    $("e-tab-theme").setAttribute("aria-selected", String(next === "theme"));
    if (next === "theme") renderTheme(api);
    else if (api.state.selected) renderPanel(api, api.state.selected);
    else
      document.getElementById("e-panel").innerHTML =
        '<p class="empty">Click something on the page to edit it.</p>';
  };
  $("e-tab-edit").onclick = () => setTab("edit");
  $("e-tab-theme").onclick = () => setTab("theme");

  window.addEventListener("nocms:selected", (e) => {
    if (tab !== "edit") setTab("edit");
    else renderPanel(api, e.detail.path);
  });
  window.addEventListener("nocms:tree-changed", () => {
    if (tab === "edit" && api.state.selected) renderPanel(api, api.state.selected);
  });
}

/**
 * A list prop is an array of objects, so it gets a real editor: each item's own fields,
 * reorder, remove and add. The item shape comes from the Zod schema, so a section pack
 * describes its list once and the panel follows.
 */
function renderList(api, path, propName, itemShape, ui, items, wrap) {
  const commit = (next) => {
    api.setProp(path, propName, next);
    renderList(api, path, propName, itemShape, ui, next, wrap);
  };

  for (const el of [...wrap.children].slice(1)) el.remove();

  items.forEach((item, index) => {
    const box = document.createElement("div");
    box.className = "item";

    const head = document.createElement("header");
    const title = document.createElement("strong");
    title.textContent = item[ui.itemLabel] || `Item ${index + 1}`;
    head.append(title);
    for (const [glyph, fn, enabled] of [
      ["↑", () => move(index, -1), index > 0],
      ["↓", () => move(index, 1), index < items.length - 1],
      ["✕", () => commit(items.filter((_, i) => i !== index)), true],
    ]) {
      const b = document.createElement("button");
      b.textContent = glyph;
      b.disabled = !enabled;
      b.onclick = fn;
      head.append(b);
    }
    box.append(head);

    for (const [field, fieldType] of Object.entries(itemShape)) {
      const meta = uiMeta(fieldType);
      const f = document.createElement("div");
      f.className = "field";
      const label = document.createElement("label");
      label.textContent = meta.label ?? field;
      const input = document.createElement("input");
      input.type = "text";
      input.value = item[field] ?? "";
      input.oninput = () => {
        const next = items.map((it, i) =>
          i === index ? { ...it, [field]: input.value } : it,
        );
        api.setProp(path, propName, next);
        if (field === ui.itemLabel)
          title.textContent = input.value || `Item ${index + 1}`;
      };
      f.append(label, input);
      box.append(f);
    }
    wrap.append(box);
  });

  function move(index, delta) {
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved);
    commit(next);
  }

  const add = document.createElement("button");
  add.className = "add";
  add.textContent = "Add item";
  add.onclick = () => {
    const blank = Object.fromEntries(Object.keys(itemShape).map((k) => [k, ""]));
    commit([...items, blank]);
  };
  wrap.append(add);
}

/** Theme editing: the owner changes token VALUES, never rules. */
function renderTheme(api) {
  const host = document.getElementById("e-panel");
  host.innerHTML = "";
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "Changes apply to every page at once, immediately.";
  host.append(hint);

  for (const [group, tokens] of groupTokens(api.themeTokens())) {
    const heading = document.createElement("p");
    heading.className = "group";
    heading.textContent = group;
    host.append(heading);

    for (const token of tokens) {
      const wrap = document.createElement("div");
      wrap.className = "field";
      const label = document.createElement("label");
      // Show the real token name: --step-1 and --step--1 are different tokens, and
      // prettifying them into "step 1" makes two rows look identical.
      label.textContent = token.name;
      label.style.fontFamily = "ui-monospace, monospace";
      wrap.append(label);

      if (token.kind === "colour" && /^#[0-9a-f]{6}$/i.test(token.value)) {
        const row = document.createElement("div");
        row.className = "swatch";
        const picker = document.createElement("input");
        picker.type = "color";
        picker.value = token.value;
        const text = document.createElement("input");
        text.type = "text";
        text.value = token.value;
        picker.oninput = () => {
          text.value = picker.value;
          api.setToken(token.name, picker.value);
        };
        text.oninput = () => {
          if (/^#[0-9a-f]{6}$/i.test(text.value)) picker.value = text.value;
          api.setToken(token.name, text.value);
        };
        row.append(picker, text);
        wrap.append(row);
      } else {
        const input = document.createElement("input");
        input.type = "text";
        input.value = token.value;
        input.oninput = () => api.setToken(token.name, input.value);
        wrap.append(input);
      }
      host.append(wrap);
    }
  }
}

function renderPanel(api, path) {
  const host = document.getElementById("e-panel");
  const node = api.nodeAt(path);
  if (!node) {
    host.innerHTML = '<p class="empty">Nothing selected.</p>';
    return;
  }

  const def = api.componentFor(node.name);
  const shape = def?.schema?.shape ?? {};
  host.innerHTML = "";

  const row = document.createElement("div");
  row.className = "row";
  for (const [label, fn] of [
    ["↑", () => api.moveSection(path, -1)],
    ["↓", () => api.moveSection(path, 1)],
    ["Remove", () => api.removeSection(path)],
  ]) {
    const b = document.createElement("button");
    b.textContent = label;
    b.onclick = fn;
    row.append(b);
  }
  host.append(row);

  for (const [name, zodType] of Object.entries(shape)) {
    const prop = node.props[name];
    const ui = uiMeta(zodType);
    // .default()/.optional() wrap the real type, so unwrap before reading options.
    let core = zodType;
    while (core && !core.options && typeof core.unwrap === "function")
      core = core.unwrap();
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    label.textContent = ui.label ?? name;
    wrap.append(label);

    // A prop set in code stays visible but is not editable — dropping down is allowed,
    // being silently blocked is not.
    if (prop?.kind === "code") {
      const locked = document.createElement("div");
      locked.className = "locked";
      locked.textContent = `{${prop.source}} — set in code`;
      wrap.append(locked);
      host.append(wrap);
      continue;
    }

    const value = prop?.value ?? "";
    let input;
    if (ui.field === "select") {
      input = document.createElement("select");
      for (const opt of enumOptions(zodType) ?? []) {
        const o = document.createElement("option");
        o.value = o.textContent = opt;
        input.append(o);
      }
      input.value = value;
    } else if (ui.field === "richtext") {
      input = document.createElement("textarea");
      input.value = value;
    } else if (ui.field === "list") {
      renderList(api, path, name, listItemShape(zodType) ?? {}, ui, value ?? [], wrap);
      host.append(wrap);
      continue;
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.value = value;
    }
    input.oninput = () => api.setProp(path, name, input.value);
    wrap.append(input);
    host.append(wrap);
  }

  const note = document.createElement("p");
  note.className = "note";
  note.textContent =
    api.state.storage.mode === "local"
      ? "Local mode: publishing writes straight to your working tree."
      : "Unpublished edits live in this browser only.";
  host.append(note);
}
