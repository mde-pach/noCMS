/**
 * The editor's interface, built from the editor's OWN copy of the component library
 * (editor/ui). It never imports from the site's src/components: if it did, deleting a
 * component would break the editor you need in order to fix it.
 *
 * The chrome lives in the parent document; the site lives in the canvas iframe. They
 * share components and use different token scopes, so re-theming a site leaves the
 * editor alone.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { groupTokens } from "../src/lib/theme.mjs";
import type { ComponentDef, EditorApi, PropValue } from "./types.ts";
import {
  Button,
  Dialog,
  Empty,
  Field,
  Group,
  Input,
  LockedValue,
  Row,
  Select,
  Tabs,
  Textarea,
} from "./ui/index.ts";
import { enumOptions, listItemShape, uiMeta } from "./zod-ui.mjs";

interface FieldUi {
  field?: string;
  label?: string;
  itemLabel?: string;
}
type ListItem = Record<string, string>;
interface ThemeToken {
  name: string;
  value: string;
  kind: string;
}

/** Re-render the chrome whenever the editor says something changed. */
function useEditorEvents(names: string[]) {
  const [, bump] = useState(0);
  useEffect(() => {
    const onChange = () => bump((n) => n + 1);
    for (const name of names) window.addEventListener(name, onChange);
    return () => {
      for (const name of names) window.removeEventListener(name, onChange);
    };
  }, [names]);
}

const EVENTS = [
  "nocms:selected",
  "nocms:dirty",
  "nocms:tree-changed",
  "nocms:page-opened",
];

function Header({ api, onPublish }: { api: EditorApi; onPublish: () => void }) {
  const [status, setStatus] = useState(() => {
    const carried = sessionStorage.getItem("nocms:last-status");
    if (carried) sessionStorage.removeItem("nocms:last-status");
    return carried ?? "";
  });
  const [dirty, setDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    const onDirty = (e: CustomEvent) => {
      setDirty(e.detail.dirty);
      if (e.detail.dirty) setStatus("unsaved changes");
    };
    const onStatus = (e: CustomEvent) => {
      setStatus(e.detail.text);
      setCanUndo(api.canUndo());
    };
    window.addEventListener("nocms:dirty", onDirty as EventListener);
    window.addEventListener("nocms:status", onStatus as EventListener);
    return () => {
      window.removeEventListener("nocms:dirty", onDirty as EventListener);
      window.removeEventListener("nocms:status", onStatus as EventListener);
    };
  }, [api]);

  return (
    <header className="ed-header">
      <span className="ed-brand">noCMS</span>
      <Select
        id="e-pages"
        title="Page"
        value={api.state.pagePath}
        options={api.state.pages.map((p) => ({ value: p.path, label: p.route }))}
        onChange={async (e) => {
          const result = await api.openPage(e.target.value);
          if (result.blocked) setStatus("publish or discard first");
          else if (result.error) setStatus(result.error);
        }}
      />
      <Button
        id="e-new-page"
        title="Add a page"
        onClick={async () => {
          const route = prompt("URL for the new page, e.g. /about");
          if (!route) return;
          const result = await api.createPage(route);
          setStatus(result.error ?? `created ${result.route}`);
        }}
      >
        +
      </Button>
      <span className="ed-chip" id="e-mode">
        {api.state.storage.mode === "local" ? "local · working tree" : "github"}
      </span>
      <span className="ed-spacer" />
      <span className="ed-chip" id="e-status">
        {status}
      </span>
      {canUndo ? (
        <Button
          id="e-undo"
          onClick={async () => {
            setStatus("undoing…");
            const result = await api.undoPublish();
            setStatus(result.error ?? "publish undone");
            setCanUndo(false);
          }}
        >
          Undo
        </Button>
      ) : null}
      <Button id="e-save" variant="primary" disabled={!dirty} onClick={onPublish}>
        Publish
      </Button>
    </header>
  );
}

function Library({ api }: { api: EditorApi }) {
  const groups = new Map<string, ComponentDef[]>();
  for (const component of api.listComponents()) {
    const group = component.meta.category ?? "Components";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)?.push(component);
  }
  const ordered = [...groups].sort(([a], [b]) =>
    a === "Sections" ? -1 : b === "Sections" ? 1 : a.localeCompare(b),
  );
  return (
    <aside className="ed-aside ed-aside--left">
      <div className="ed-lib" id="e-lib">
        {ordered.map(([group, items]) => (
          <div key={group}>
            <Group>{group}</Group>
            {items.map((component) => (
              <Button key={component.id} onClick={() => api.addComponent(component.id)}>
                {component.meta.name}
                <small>{component.meta.description ?? ""}</small>
              </Button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

function ListField({
  api,
  path,
  name,
  itemShape,
  ui,
  items,
}: {
  api: EditorApi;
  path: number[];
  name: string;
  itemShape: Record<string, unknown>;
  ui: FieldUi;
  items: ListItem[];
}) {
  const commit = (next: ListItem[]) => api.setProp(path, name, next);
  const move = (index: number, delta: number) => {
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(index + delta, 0, moved);
    commit(next);
  };
  return (
    <>
      {items.map((item, index) => (
        <div
          className="ed-item"
          // biome-ignore lint/suspicious/noArrayIndexKey: positional data; index is identity
          key={`${name}-${index}`}
        >
          <div className="ed-item__head">
            <strong>
              {(ui.itemLabel ? item[ui.itemLabel] : "") || `Item ${index + 1}`}
            </strong>
            <Button size="sm" disabled={index === 0} onClick={() => move(index, -1)}>
              ↑
            </Button>
            <Button
              size="sm"
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              ↓
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => commit(items.filter((_, i) => i !== index))}
            >
              ✕
            </Button>
          </div>
          {Object.entries(itemShape).map(([field, fieldType]) => (
            <Field key={field} label={uiMeta(fieldType).label ?? field}>
              <Input
                value={item[field] ?? ""}
                onChange={(e) =>
                  commit(
                    items.map((it, i) =>
                      i === index ? { ...it, [field]: e.target.value } : it,
                    ),
                  )
                }
              />
            </Field>
          ))}
        </div>
      ))}
      <Button
        className="ed-add"
        onClick={() =>
          commit([
            ...items,
            Object.fromEntries(Object.keys(itemShape).map((k) => [k, ""])),
          ])
        }
      >
        Add item
      </Button>
    </>
  );
}

function ImageField({
  api,
  path,
  name,
  value,
}: {
  api: EditorApi;
  path: number[];
  name: string;
  value: string;
}) {
  const [status, setStatus] = useState(value || "No image yet");
  return (
    <>
      {value ? <img className="ed-thumb" src={value} alt="" /> : null}
      <p className="ed-field__hint">{status}</p>
      <input
        type="file"
        accept="image/*"
        style={{ fontSize: 12, width: "100%" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setStatus("processing…");
          try {
            const result = await api.addImage(file);
            setStatus(
              `${result.src} · ${result.width}×${result.height} · ${Math.round(result.bytes / 1024)} KB`,
            );
            await api.setProp(path, name, result.src);
          } catch (err) {
            setStatus(`could not use that file: ${(err as Error).message}`);
          }
        }}
      />
      {value ? (
        <Button onClick={() => api.setProp(path, name, "")}>Remove image</Button>
      ) : null}
    </>
  );
}

function EditPanel({ api }: { api: EditorApi }) {
  const path = api.state.selected;
  if (!path) return <Empty>Click something on the page to edit it.</Empty>;
  const node = api.nodeAt(path);
  if (!node) return <Empty>Nothing selected.</Empty>;

  const def = api.componentFor(node.name);
  const shape = def?.schema?.shape ?? {};

  return (
    <>
      <Row>
        <Button onClick={() => api.moveSection(path, -1)}>↑</Button>
        <Button onClick={() => api.moveSection(path, 1)}>↓</Button>
        <Button variant="danger" onClick={() => api.removeSection(path)}>
          Remove
        </Button>
      </Row>

      {Object.keys(shape).length === 0 ? (
        <Empty>
          {def
            ? `${node.name} has no editable properties. Add a descriptor beside it to give it a panel.`
            : `${node.name} is not a component the editor can resolve.`}
        </Empty>
      ) : null}

      {Object.entries(shape).map(([name, zodType]) => {
        const prop: PropValue | undefined = node.props[name];
        const ui = uiMeta(zodType) as FieldUi;
        // A prop's value is whatever the page holds; each field narrows it itself.
        const value = (prop?.value ?? "") as never;
        const label = ui.label ?? name;

        if (prop?.kind === "code") {
          return (
            <Field key={name} label={label}>
              <LockedValue>{`{${prop.source}} — set in code`}</LockedValue>
            </Field>
          );
        }
        if (ui.field === "image") {
          return (
            <Field key={name} label={label}>
              <ImageField api={api} path={path} name={name} value={value} />
            </Field>
          );
        }
        if (ui.field === "list") {
          return (
            <Field key={name} label={label}>
              <ListField
                api={api}
                path={path}
                name={name}
                itemShape={listItemShape(zodType) ?? {}}
                ui={ui}
                items={value || []}
              />
            </Field>
          );
        }
        if (ui.field === "select") {
          return (
            <Field key={name} label={label}>
              <Select
                value={value}
                options={((enumOptions(zodType) ?? []) as string[]).map((o) => ({
                  value: o,
                  label: o,
                }))}
                onChange={(e) => api.setProp(path, name, e.target.value)}
              />
            </Field>
          );
        }
        const Control = ui.field === "richtext" ? Textarea : Input;
        return (
          <Field key={name} label={label}>
            <Control
              value={value}
              onChange={(e) => api.setProp(path, name, e.target.value)}
            />
          </Field>
        );
      })}

      <p className="ed-field__hint">
        {api.state.storage.mode === "local"
          ? "Local mode: publishing writes straight to your working tree."
          : "Unpublished edits live in this browser only."}
      </p>
    </>
  );
}

function ThemePanel({ api }: { api: EditorApi }) {
  return (
    <>
      <p className="ed-field__hint" style={{ marginBottom: 12 }}>
        Changes apply to every page at once, immediately.
      </p>
      {[...groupTokens(api.themeTokens())].map(
        ([group, tokens]: [string, ThemeToken[]]) => (
          <div key={group}>
            <Group>{group}</Group>
            {tokens.map((token) => (
              <Field key={token.name} label={<code>{token.name}</code>}>
                {token.kind === "colour" && /^#[0-9a-f]{6}$/i.test(token.value) ? (
                  <div className="ed-swatch">
                    <input
                      type="color"
                      value={token.value}
                      onChange={(e) => api.setToken(token.name, e.target.value)}
                    />
                    <Input
                      value={token.value}
                      onChange={(e) => api.setToken(token.name, e.target.value)}
                    />
                  </div>
                ) : (
                  <Input
                    value={token.value}
                    onChange={(e) => api.setToken(token.name, e.target.value)}
                  />
                )}
              </Field>
            ))}
          </div>
        ),
      )}
    </>
  );
}

function Editor({ api }: { api: EditorApi }) {
  useEditorEvents(EVENTS);
  const [tab, setTab] = useState("edit");
  const [confirming, setConfirming] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onSelected = () => setTab("edit");
    window.addEventListener("nocms:selected", onSelected);
    return () => window.removeEventListener("nocms:selected", onSelected);
  }, []);

  const publish = useCallback(async () => {
    setConfirming(false);
    window.dispatchEvent(
      new CustomEvent("nocms:status", { detail: { text: "publishing…" } }),
    );
    try {
      const target = await api.save();
      const text =
        api.state.storage.mode === "local"
          ? `written to ${target}`
          : `published to ${target}`;
      sessionStorage.setItem("nocms:last-status", text);
      window.dispatchEvent(new CustomEvent("nocms:status", { detail: { text } }));
    } catch (err) {
      window.dispatchEvent(
        new CustomEvent("nocms:status", {
          detail: { text: `failed: ${(err as Error).message}` },
        }),
      );
    }
  }, [api]);

  return (
    <>
      <Header api={api} onPublish={() => setConfirming(true)} />
      <main className="ed-main">
        <Library api={api} />
        <div className="ed-canvas">
          {/* Rendered once and never re-keyed: recreating it would remount the canvas. */}
          <iframe id="nocms-canvas" title="Page preview" ref={frame} />
        </div>
        <aside className="ed-aside ed-aside--right">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "edit", label: "Edit" },
              { id: "theme", label: "Theme" },
            ]}
          />
          <div id="e-panel">
            {tab === "edit" ? <EditPanel api={api} /> : <ThemePanel api={api} />}
          </div>
        </aside>
      </main>
      {confirming ? (
        <Dialog
          title="Publish these changes?"
          description={
            api.state.storage.mode === "local"
              ? "They will be written to your working tree."
              : "Your site will rebuild and go live in a minute or two."
          }
          onClose={() => setConfirming(false)}
          footer={
            <>
              <Button id="pub-cancel" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button id="pub-go" variant="primary" onClick={publish}>
                Publish
              </Button>
            </>
          }
        >
          <ul>
            {(api.changes().length ? api.changes() : ["No changes to describe"]).map(
              (change) => (
                <li key={change}>{change}</li>
              ),
            )}
          </ul>
        </Dialog>
      ) : null}
    </>
  );
}

export function mountChrome(api: EditorApi) {
  createRoot(document.body).render(<Editor api={api} />);
}
