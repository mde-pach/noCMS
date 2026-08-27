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
  button{font:inherit;border:1px solid var(--e-line);background:var(--e-panel);color:var(--e-ink);
         border-radius:7px;padding:6px 12px;cursor:pointer}
  button:hover{border-color:var(--e-accent)}
  button.primary{background:var(--e-accent);border-color:var(--e-accent);color:#fff}
  button.primary[disabled]{opacity:.45;cursor:default}
  button:focus-visible{outline:2px solid var(--e-accent);outline-offset:2px}
  main{display:grid;grid-template-columns:210px 1fr 290px;overflow:hidden}
  aside{background:var(--e-panel);overflow:auto;padding:14px}
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
      <span class="mode" id="e-mode"></span>
      <span class="spacer"></span>
      <span class="mode" id="e-status"></span>
      <button class="primary" id="e-save" disabled>Publish</button>
    </header>
    <main>
      <aside class="left"><h2>Sections</h2><div class="lib" id="e-lib"></div></aside>
      <div class="canvas"><iframe id="nocms-canvas" title="Page preview"></iframe></div>
      <aside class="right"><h2>Edit</h2><div id="e-panel"><p class="empty">Click something on the page to edit it.</p></div></aside>
    </main>`;

  const $ = (id) => document.getElementById(id);
  $("e-mode").textContent =
    api.state.storage.mode === "local" ? "local · working tree" : "github";

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

  window.addEventListener("nocms:selected", (e) => renderPanel(api, e.detail.path));
  window.addEventListener("nocms:tree-changed", () => {
    if (api.state.selected) renderPanel(api, api.state.selected);
  });
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
    const ui = (typeof zodType.meta === "function" ? zodType.meta() : null) ?? {};
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
      for (const opt of core?.options ?? []) {
        const o = document.createElement("option");
        o.value = o.textContent = opt;
        input.append(o);
      }
      input.value = value;
    } else if (ui.field === "richtext") {
      input = document.createElement("textarea");
      input.value = value;
    } else if (ui.field === "list") {
      const summary = document.createElement("div");
      summary.className = "empty";
      summary.textContent = `${(value || []).length} items — edit on the page`;
      wrap.append(summary);
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
