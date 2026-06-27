// The editor shell: the interaction loop that turns the pieces into a usable editor. It
// frames the canvas with the app chrome (top bar) and a docked right rail, keeps one live
// MdxDocument, and on every selection resolves the meaningful node, looks up its controls,
// and renders the props panel. A panel edit mutates the node in place; the shell
// re-serializes, re-renders the canvas from the updated source, and re-highlights the same
// node by its index-path — never by raw offset, which shifts when the edit changes length.
//
// Every structural change — insert, delete, duplicate, reorder, drag — is one tree-transform
// over the uniform block tree (D15), addressed by index-path, then re-serialized to canonical
// MDX. Because every edit funnels through one commit that snapshots the serialized MDX,
// undo/redo is a single uniform stack. Nothing here special-cases a block type.
//
// Presentational chrome state (breakpoint, appearance, dirty, publish status, the active
// overlay, the expanded design panel) lives alongside the document state and is pushed into
// pure presenter components via small render functions, mirroring how the canvas overlay and
// toolbar are kept in sync.

import {
  type ComponentManifest,
  type ComponentRegistry,
  type ComposedComponentDef,
  controlsOf,
  defineSavedComponent,
  type PropPrimitive,
  type PropSlot,
  registryManifest,
  type SavedDef,
  savedDefToBlock,
} from "@nocms/components";
import {
  mountProseEditor,
  type ProseEditorHandle,
  toggleProseMark,
} from "@nocms/prose";
import type { ComponentMap } from "@nocms/renderer";
import { formatTokens, parseTokens, type Token, toCssVariables } from "@nocms/tokens";
import type { Nodes, Parent, PhrasingContent, Yaml } from "mdast";
import { render } from "preact";
import {
  boundingRect,
  type CanvasHandle,
  type CanvasSelection,
  mountCanvas,
  offsetFromElement,
} from "./canvas.js";
import { InsertSheet } from "./catalog.js";
import {
  type Appearance,
  type BreakpointId,
  type PublishStatus,
  TopBar,
} from "./chrome.js";
import { type BlockBox, destinationIndex, dropGapAt } from "./drag.js";
import { FormatBar } from "./format-bar.js";
import { createHistory } from "./history.js";
import { blockFromManifest, insertBlock } from "./insert.js";
import {
  getProp,
  isJsxElement,
  type JsxElement,
  type PropValue,
  setProp,
} from "./jsx-attributes.js";
import { type MdxDocument, parseMdx, serializeMdx } from "./mdx-document.js";
import { MediaPicker } from "./media.js";
import { Navigator, type NavSection } from "./navigator.js";
import {
  type IndexPath,
  indexPathOf,
  nearestOfType,
  nodeAtIndexPath,
  nodeAtOffset,
} from "./position.js";
import { PropsPanel } from "./props-panel.js";
import { isProseEditable, type ProseBlock } from "./prose-edit.js";
import { PublishPopover } from "./publish.js";
import { PageRail } from "./rail.js";
import { SaveComponentDialog } from "./save-component.js";
import { selectableNode } from "./selectable.js";
import { SelectionToolbar } from "./selection-toolbar.js";
import { EDITOR_CSS, FONTS_HREF } from "./theme.js";
import { TokensPanel } from "./tokens-panel.js";
import { insertAt, moveChild, moveNode, removeAt } from "./tree-edit.js";

const BREAKPOINT_WIDTH: Record<BreakpointId, string> = {
  L0: "390px",
  L1: "600px",
  L2: "834px",
  L3: "1040px",
  L4: "100%",
};

export interface EditorOptions {
  /** DOM node the editor mounts into; the shell owns its contents. */
  target: Element;
  /** the document to edit; MDX text is the source of truth. */
  mdx: string;
  /** the component library MDX tags resolve to in the canvas; each block carries
   *  its controls, from which the props panel renders fields. */
  components: ComponentRegistry;
  /** @deprecated controls are now derived from each block's schema (D9); ignored. */
  schemas?: Record<string, unknown>;
  /** values exposed to the document as props. */
  data?: Record<string, unknown>;
  /** flat token source; when present, the design panel themes the canvas live. */
  tokens?: string;
  /** fired with the serialized MDX after every edit — the seam to save/commit. */
  onChange?: (mdx: string) => void;
  /** fired with the flat token source after a theme edit — the seam to save/commit. */
  onTokensChange?: (tokens: string) => void;
  /** saved-component definitions to load into the registry at mount, so a page that
   *  references them renders. The host reads these from the repo (the persistence seam). */
  savedComponents?: SavedDef[];
  /** fired with a new saved-component definition when one is authored — the seam to
   *  persist it to the repo so it survives a reload (symmetric with `onChange`). */
  onSaveComponent?: (def: SavedDef) => void;
  /** the host shown in the top bar identity; defaults to a placeholder. */
  siteHost?: string;
  /** the page label shown in the top-bar pill. */
  pageName?: string;
}

export interface EditorHandle {
  /** The live prose view when a text block is being edited in place, else undefined. */
  proseView(): ProseEditorHandle["view"] | undefined;
  /** The index-path of the selected block, or undefined when nothing is selected. */
  selection(): IndexPath | undefined;
  /** Step the uniform history back/forward; the seam for host undo/redo chrome. */
  undo(): void;
  redo(): void;
  dispose(): void;
}

function toComponentMap(registry: ComponentRegistry): ComponentMap {
  return Object.fromEntries(
    Object.entries(registry).map(([name, entry]) => [name, entry.component]),
  );
}

function childrenOf(node: Nodes | undefined): Nodes[] {
  return node && "children" in node ? (node as Parent).children : [];
}

/** A keystroke landing in a text field or the prose view must not trigger a block-level
 *  shortcut (delete, reorder) — that is the field's own input. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.closest(".ProseMirror")) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function frontmatterNode(doc: MdxDocument): Yaml | undefined {
  return doc.children.find((n): n is Yaml => n.type === "yaml");
}

function readFrontmatter(doc: MdxDocument): { title: string; description: string } {
  const text = frontmatterNode(doc)?.value ?? "";
  const get = (key: string): string => {
    const match = text.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
    return match?.[1] ? match[1].trim().replace(/^["']|["']$/g, "") : "";
  };
  return { title: get("title"), description: get("description") };
}

function writeFrontmatter(doc: MdxDocument, key: string, value: string): void {
  let node = frontmatterNode(doc);
  if (!node) {
    node = { type: "yaml", value: "" };
    doc.children.unshift(node);
  }
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:.*$`, "m");
  node.value = re.test(node.value)
    ? node.value.replace(re, line)
    : node.value
      ? `${node.value}\n${line}`
      : line;
}

/**
 * Mount the in-site editor into `target`. Resolves once the canvas has rendered.
 * Saving/publishing (repo + auth) wires onto `onChange` and is out of scope here.
 */
export async function mountEditor(options: EditorOptions): Promise<EditorHandle> {
  const { target, mdx, components, data, onChange, onTokensChange } = options;
  // The canvas reads this map live on every paint, so registering a saved component is a
  // mutation of `components` (controls/manifests) plus `componentMap` (what the canvas renders).
  const componentMap = toComponentMap(components);
  const registerSaved = (def: SavedDef): void => {
    const block = savedDefToBlock(def, components);
    components[def.name] = block;
    componentMap[def.name] = block.component;
  };
  // Rehydrate persisted definitions before the first paint so a page referencing them renders.
  for (const def of options.savedComponents ?? []) registerSaved(def);
  let doc: MdxDocument = parseMdx(mdx);
  const history = createHistory(serializeMdx(doc));
  const initialMdx = mdx;
  const initialTokensSrc = options.tokens;

  // --- presentational chrome state -------------------------------------------------
  let breakpoint: BreakpointId = "L3";
  let appearance: Appearance = "light";
  let dirty = false;
  let publishStatus: PublishStatus = "idle";
  let overlay: "catalog" | "publish" | "navigator" | "media" | "save-component" | null =
    null;
  let mediaTarget: { element: JsxElement; key: string } | undefined;
  let saveTarget: { node: JsxElement; path: IndexPath; container: boolean } | undefined;
  let brandExpanded = false;
  let tokens: Token[] = options.tokens !== undefined ? parseTokens(options.tokens) : [];
  let publishTimer: ReturnType<typeof setTimeout> | undefined;

  // --- DOM scaffold ----------------------------------------------------------------
  const style = document.createElement("style");
  style.textContent = EDITOR_CSS;
  const fontsLink = document.createElement("link");
  fontsLink.rel = "stylesheet";
  fontsLink.href = FONTS_HREF;
  document.head.appendChild(fontsLink);

  const layout = document.createElement("div");
  layout.className = "nocms-editor";
  const chromeHost = document.createElement("div");
  const body = document.createElement("div");
  body.className = "nocms-body";
  const canvasScroll = document.createElement("div");
  canvasScroll.className = "nocms-canvas-region";
  const surface = document.createElement("div");
  surface.className = "nocms-editor-canvas";
  surface.style.width = BREAKPOINT_WIDTH[breakpoint];
  const toolbarHost = document.createElement("div");
  toolbarHost.className = "nocms-toolbar-host";
  const formatHost = document.createElement("div");
  formatHost.className = "nocms-toolbar-host";
  const hoverHost = document.createElement("div");
  const panelRegion = document.createElement("div");
  panelRegion.className = "nocms-editor-panel";
  const railHost = document.createElement("div");
  const modalHost = document.createElement("div");
  const popoverHost = document.createElement("div");

  panelRegion.append(railHost);
  canvasScroll.append(surface);
  body.append(canvasScroll, panelRegion, modalHost);
  layout.append(chromeHost, body, popoverHost);
  target.append(style, layout);

  // Runtime theming: a single <style> the design panel rewrites live (no rebuild).
  const themeStyle = document.createElement("style");
  if (options.tokens !== undefined) {
    themeStyle.textContent = toCssVariables(tokens);
    target.append(themeStyle);
  }

  let selectedPath: IndexPath | undefined;
  let dragFrom: IndexPath | undefined;

  let prose: { handle: ProseEditorHandle; el: Element; path: IndexPath } | undefined;

  const childCountAt = (path: IndexPath): number =>
    childrenOf(nodeAtIndexPath(doc, path)).length;

  // The floating toolbar and hover box are positioned in the surface's content space.
  const surfaceTop = (el: Element): number =>
    boundingRect(el).top - surface.getBoundingClientRect().top + surface.scrollTop;
  const surfaceLeft = (el: Element): number =>
    boundingRect(el).left - surface.getBoundingClientRect().left + surface.scrollLeft;

  const elementAtPath = (path: IndexPath): Element | null => {
    const offset = nodeAtIndexPath(doc, path)?.position?.start.offset;
    return offset === undefined
      ? null
      : surface.querySelector(`[data-mdx-pos="${offset}"]`);
  };

  const markDirty = (): void => {
    if (!dirty) {
      dirty = true;
      renderChrome();
    }
  };

  // --- chrome / rail / overlay renderers -------------------------------------------
  function renderChrome(): void {
    render(
      <TopBar
        siteHost={options.siteHost ?? "nocms.github.io"}
        pageName={options.pageName ?? "Home"}
        breakpoint={breakpoint}
        onBreakpoint={setBreakpoint}
        appearance={appearance}
        onAppearance={toggleAppearance}
        dirty={dirty}
        onReset={() => void resetEdits()}
        publishStatus={publishStatus}
        onPublish={togglePublish}
        onMenu={openNavigator}
        onPagePill={openNavigator}
        avatarInitial="A"
      />,
      chromeHost,
    );
  }

  const brandPanel = (): ReturnType<typeof TokensPanel> | null => {
    if (tokens.length === 0) return null;
    return (
      <TokensPanel
        tokens={tokens}
        onChange={(next, flat, css) => {
          tokens = next;
          themeStyle.textContent = css;
          onTokensChange?.(flat);
          markDirty();
          renderRail();
        }}
      />
    );
  };

  function renderRail(): void {
    const node = selectedPath ? nodeAtIndexPath(doc, selectedPath) : undefined;
    if (node && selectedPath && selectedPath.length > 0) {
      if (isJsxElement(node) && node.name) {
        const def = components[node.name];
        const controls = def ? controlsOf(def) : [];
        if (controls.length > 0) {
          render(
            <PropsPanel
              element={node}
              component={node.name}
              meta="SECTION · CORE"
              controls={controls}
              onChange={handleEdit}
              onPickImage={(key) => openMedia(node, key)}
            />,
            railHost,
          );
          return;
        }
      }
      render(
        <p class="nocms-empty">No editable properties for this block.</p>,
        railHost,
      );
      return;
    }

    const fm = readFrontmatter(doc);
    render(
      <PageRail
        pageName={options.pageName ?? "Home"}
        route="/"
        title={fm.title}
        description={fm.description}
        onTitle={(v) => editFrontmatter("title", v)}
        onDescription={(v) => editFrontmatter("description", v)}
        brandExpanded={brandExpanded}
        onToggleBrand={() => {
          brandExpanded = !brandExpanded;
          renderRail();
        }}
        brandPanel={brandPanel()}
        onAddSection={openCatalog}
      />,
      railHost,
    );
  }

  function sectionOutline(): NavSection[] {
    const sel = selectedPath?.length === 1 ? selectedPath[0] : undefined;
    return doc.children.flatMap((node, index) => {
      if (node.type === "yaml") return [];
      const label = "name" in node && node.name ? String(node.name) : node.type;
      return [{ label, index, selected: index === sel }];
    });
  }

  function mediaItems() {
    return [
      {
        url: "https://placehold.co/400x300/B0542F/ffffff?text=hero",
        name: "hero-cover.jpg",
      },
      { url: "https://placehold.co/400x300/5B6B4A/ffffff?text=team", name: "team.jpg" },
      {
        url: "https://placehold.co/400x300/3D5A98/ffffff?text=office",
        name: "office.jpg",
      },
      {
        url: "https://placehold.co/400x300/BC9A4A/ffffff?text=product",
        name: "product.jpg",
      },
      {
        url: "https://placehold.co/400x300/1A1916/ffffff?text=banner",
        name: "banner.jpg",
      },
    ];
  }

  function renderOverlays(): void {
    if (overlay === "catalog") {
      render(
        <InsertSheet
          manifests={registryManifest(components)}
          onInsert={(manifest) => void handleInsert(manifest)}
          onClose={closeOverlay}
        />,
        modalHost,
      );
    } else if (overlay === "navigator") {
      render(
        <Navigator
          pageName={options.pageName ?? "Home"}
          pages={["Home", "About", "Work", "Journal", "Contact"]}
          sections={sectionOutline()}
          onSelectSection={(index) => {
            select([index]);
            closeOverlay();
          }}
          onClose={closeOverlay}
        />,
        modalHost,
      );
    } else if (overlay === "media") {
      render(
        <MediaPicker
          items={mediaItems()}
          onInsert={(url) => void chooseMedia(url)}
          onClose={closeOverlay}
        />,
        modalHost,
      );
    } else if (overlay === "save-component" && saveTarget) {
      const base = saveTarget.node.name ?? "";
      const def = components[base];
      const controls = def ? controlsOf(def) : [];
      const values: Record<string, PropValue> = {};
      for (const control of controls) {
        const value = getProp(saveTarget.node, control.key) ?? control.default;
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          values[control.key] = value;
        }
      }
      const el = elementAtPath(saveTarget.path);
      render(
        <SaveComponentDialog
          base={base}
          controls={controls}
          values={values}
          previewHtml={el?.outerHTML}
          container={saveTarget.container}
          onSave={(name, exposed, slot) => void saveAsComponent(name, exposed, slot)}
          onClose={closeOverlay}
        />,
        modalHost,
      );
    } else {
      render(null, modalHost);
    }

    if (overlay === "publish") {
      render(
        <PublishPopover
          changes={changeset()}
          lastDeploy="2d ago"
          onPublish={() => void runPublish()}
          onClose={closeOverlay}
        />,
        popoverHost,
      );
    } else {
      render(null, popoverHost);
    }
  }

  // --- chrome actions --------------------------------------------------------------
  function setBreakpoint(bp: BreakpointId): void {
    breakpoint = bp;
    surface.style.width = BREAKPOINT_WIDTH[bp];
    renderChrome();
    // Geometry shifted: re-anchor the selection overlay and toolbar.
    canvas.highlight(selectedPath);
    renderToolbar();
  }

  function toggleAppearance(): void {
    appearance = appearance === "light" ? "dark" : "light";
    surface.dataset.appearance = appearance;
    renderChrome();
  }

  async function resetEdits(): Promise<void> {
    if (initialTokensSrc !== undefined) {
      tokens = parseTokens(initialTokensSrc);
      themeStyle.textContent = toCssVariables(tokens);
      onTokensChange?.(formatTokens(tokens));
    }
    dirty = false;
    publishStatus = "idle";
    await commit(initialMdx, undefined);
    dirty = false;
    renderChrome();
    renderRail();
  }

  function togglePublish(): void {
    if (publishStatus === "publishing") return;
    overlay = overlay === "publish" ? null : "publish";
    renderOverlays();
  }

  function changeset(): { kind: "edit" | "add"; label: string }[] {
    if (!dirty) return [];
    return [{ kind: "edit", label: "Unpublished edits on this page" }];
  }

  async function runPublish(): Promise<void> {
    overlay = null;
    renderOverlays();
    publishStatus = "publishing";
    renderChrome();
    publishTimer = setTimeout(() => {
      publishStatus = "published";
      dirty = false;
      renderChrome();
    }, 1600);
  }

  const openCatalog = (): void => {
    overlay = "catalog";
    renderOverlays();
  };
  const openNavigator = (): void => {
    overlay = "navigator";
    renderOverlays();
  };
  const openMedia = (element: JsxElement, key: string): void => {
    mediaTarget = { element, key };
    overlay = "media";
    renderOverlays();
  };
  const chooseMedia = async (url: string): Promise<void> => {
    if (mediaTarget) {
      setProp(mediaTarget.element, mediaTarget.key, url);
      mediaTarget = undefined;
      overlay = null;
      renderOverlays();
      await handleEdit();
    }
  };
  const closeOverlay = (): void => {
    overlay = null;
    mediaTarget = undefined;
    saveTarget = undefined;
    renderOverlays();
  };

  const openSaveComponent = (): void => {
    const node = selectedPath ? nodeAtIndexPath(doc, selectedPath) : undefined;
    if (!node || !selectedPath || !isJsxElement(node) || !node.name) return;
    const def = components[node.name];
    if (!def || controlsOf(def).length === 0) return;
    saveTarget = {
      node,
      path: selectedPath,
      container: childrenOf(node).length > 0,
    };
    overlay = "save-component";
    renderOverlays();
  };

  // Build a saved component from the selection: capture the base's current prop values, bake the
  // locked ones, register the new block, then convert the selection into an instance (only exposed
  // props inline). When `slot` is set the base is a container and we keep its contents as an
  // editable child region — a composed component (Phase 2); otherwise a single-brick specialize.
  const saveAsComponent = async (
    name: string,
    exposed: string[],
    slot: boolean,
  ): Promise<void> => {
    if (!saveTarget) return;
    const { node, path } = saveTarget;
    const base = node.name;
    const baseDef = base ? components[base] : undefined;
    if (!base || !baseDef) return;

    const props: Record<string, PropPrimitive> = {};
    for (const control of controlsOf(baseDef)) {
      const current: PropValue | undefined = getProp(node, control.key);
      const value = current ?? control.default;
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        props[control.key] = value;
      }
    }

    let def: SavedDef;
    if (slot) {
      const structureProps: Record<string, PropSlot> = {};
      for (const control of controlsOf(baseDef)) {
        if (exposed.includes(control.key)) {
          structureProps[control.key] = { exposed: control.key };
        } else if (props[control.key] !== undefined) {
          structureProps[control.key] = {
            fixed: props[control.key] as PropPrimitive,
          };
        }
      }
      def = {
        name,
        structure: {
          kind: "component",
          component: base,
          props: structureProps,
          children: [{ kind: "slot" }],
        },
        controls: controlsOf(baseDef)
          .filter((c) => exposed.includes(c.key))
          .map((c) => ({ ...c, default: props[c.key] })),
        slot: true,
        description: `Saved from ${base}.`,
        category: "Saved",
      } satisfies ComposedComponentDef;
    } else {
      def = defineSavedComponent({
        name,
        base,
        props,
        expose: exposed,
        description: `Saved from ${base}.`,
        category: "Saved",
      });
    }
    registerSaved(def);
    options.onSaveComponent?.(def);

    node.name = name;
    // Keep the children for a composed (slot) component; a specialized leaf has none.
    node.attributes = [];
    for (const key of exposed) {
      const value = props[key];
      if (value !== undefined) setProp(node, key, value);
    }

    overlay = null;
    saveTarget = undefined;
    renderOverlays();
    await commit(serializeMdx(doc), path);
  };

  function editFrontmatter(key: string, value: string): void {
    writeFrontmatter(doc, key, value);
    const next = serializeMdx(doc);
    history.push(next);
    onChange?.(next);
    markDirty();
  }

  // --- document edits --------------------------------------------------------------
  const handleEdit = async (): Promise<void> => {
    const next = serializeMdx(doc);
    history.push(next);
    await canvas.update(next);
    canvas.highlight(selectedPath);
    onChange?.(next);
    markDirty();
  };

  const apply = async (
    nextMdx: string,
    nextPath: IndexPath | undefined,
  ): Promise<void> => {
    doc = parseMdx(nextMdx);
    await canvas.update(nextMdx);
    select(nextPath);
  };

  const commit = async (
    nextMdx: string,
    nextPath: IndexPath | undefined,
  ): Promise<void> => {
    history.push(nextMdx);
    await apply(nextMdx, nextPath);
    onChange?.(nextMdx);
    markDirty();
  };

  const undo = (): void => {
    const state = history.undo();
    if (state === undefined) return;
    void apply(state, undefined).then(() => onChange?.(state));
  };

  const redo = (): void => {
    const state = history.redo();
    if (state === undefined) return;
    void apply(state, undefined).then(() => onChange?.(state));
  };

  const handleInsert = async (manifest: ComponentManifest): Promise<void> => {
    if (prose) await commitProse();
    overlay = null;
    renderOverlays();
    const path = insertBlock(doc, blockFromManifest(manifest), selectedPath);
    await commit(serializeMdx(doc), path);
  };

  const deleteSelected = async (): Promise<void> => {
    if (!selectedPath || selectedPath.length === 0) return;
    const next = removeAt(doc, selectedPath);
    await commit(serializeMdx(next), undefined);
  };

  const duplicateSelected = async (): Promise<void> => {
    if (!selectedPath || selectedPath.length === 0) return;
    const node = nodeAtIndexPath(doc, selectedPath);
    if (!node) return;
    const parentPath = selectedPath.slice(0, -1);
    const index = selectedPath[selectedPath.length - 1] ?? 0;
    const next = insertAt(doc, parentPath, index + 1, node);
    await commit(serializeMdx(next), [...parentPath, index + 1]);
  };

  const moveSelected = async (direction: -1 | 1): Promise<void> => {
    if (!selectedPath || selectedPath.length === 0) return;
    const parentPath = selectedPath.slice(0, -1);
    const from = selectedPath[selectedPath.length - 1] ?? 0;
    const to = Math.max(0, Math.min(from + direction, childCountAt(parentPath) - 1));
    if (to === from) return;
    const next = moveChild(doc, parentPath, from, to);
    await commit(serializeMdx(next), [...parentPath, to]);
  };

  const siblingBoxes = (parentPath: IndexPath): BlockBox[] => {
    const siblings = childrenOf(nodeAtIndexPath(doc, parentPath));
    const region = surface.getBoundingClientRect();
    const boxes: BlockBox[] = [];
    siblings.forEach((child, index) => {
      if (child.type === "yaml") return;
      const offset = child.position?.start.offset;
      const el =
        offset === undefined
          ? null
          : surface.querySelector(`[data-mdx-pos="${offset}"]`);
      if (!el) return;
      const rect = boundingRect(el);
      boxes.push({
        index,
        top: rect.top - region.top,
        bottom: rect.bottom - region.top,
      });
    });
    return boxes;
  };

  const handleDrop = async (event: DragEvent): Promise<void> => {
    if (!dragFrom || dragFrom.length === 0) return;
    event.preventDefault();
    const parentPath = dragFrom.slice(0, -1);
    const from = dragFrom[dragFrom.length - 1] ?? 0;
    const region = surface.getBoundingClientRect();
    const gap = dropGapAt(siblingBoxes(parentPath), event.clientY - region.top);
    const to = destinationIndex(from, gap);
    dragFrom = undefined;
    if (to === undefined) return;
    const next = moveNode(doc, [...parentPath, from], parentPath, to);
    await commit(serializeMdx(next), [...parentPath, to]);
  };

  function renderToolbar(): void {
    const node = selectedPath ? nodeAtIndexPath(doc, selectedPath) : undefined;
    if (!node || !selectedPath || selectedPath.length === 0 || prose) {
      render(null, toolbarHost);
      toolbarHost.style.display = "none";
      return;
    }
    const parentPath = selectedPath.slice(0, -1);
    const from = selectedPath[selectedPath.length - 1] ?? 0;
    const count = childCountAt(parentPath);
    const label = "name" in node && node.name ? String(node.name) : node.type;
    const saveDef = isJsxElement(node) && node.name ? components[node.name] : undefined;
    const saveable = saveDef !== undefined && controlsOf(saveDef).length > 0;
    const el = elementAtPath(selectedPath);
    if (el) {
      toolbarHost.style.top = `${Math.max(surfaceTop(el) - 17, 6)}px`;
      toolbarHost.style.right = "10px";
      toolbarHost.style.left = "auto";
      toolbarHost.style.display = "block";
    }
    render(
      <SelectionToolbar
        label={label}
        canMoveUp={from > 0}
        canMoveDown={from < count - 1}
        onMoveUp={() => void moveSelected(-1)}
        onMoveDown={() => void moveSelected(1)}
        onDuplicate={() => void duplicateSelected()}
        onDelete={() => void deleteSelected()}
        onSettings={() => panelRegion.scrollTo({ top: 0 })}
        onSaveAsComponent={saveable ? openSaveComponent : undefined}
        onDragStart={(event) => {
          dragFrom = selectedPath;
          event.dataTransfer?.setData("text/plain", "");
        }}
        onDragEnd={() => {
          dragFrom = undefined;
        }}
      />,
      toolbarHost,
    );
  }

  // --- hover affordance ------------------------------------------------------------
  function showHover(el: Element | undefined, label: string | undefined): void {
    if (!el) {
      render(null, hoverHost);
      return;
    }
    const top = surfaceTop(el);
    const left = surfaceLeft(el);
    const rect = boundingRect(el);
    render(
      <>
        <div
          class="nocms-hover"
          style={`top:${top}px;left:${left}px;width:${rect.width}px;height:${rect.height}px`}
        />
        {label ? (
          <div class="nc-hover-label" style={`top:${top + 8}px;left:${left + 8}px`}>
            {label}
          </div>
        ) : null}
      </>,
      hoverHost,
    );
  }

  const clearHover = (): void => showHover(undefined, undefined);

  const handleHover = (event: MouseEvent): void => {
    if (prose || dragFrom) {
      clearHover();
      return;
    }
    const t = event.target;
    if (!(t instanceof Element)) return;
    const offset = offsetFromElement(t);
    const path = offset === undefined ? [] : nodeAtOffset(doc, offset);
    const node = offset === undefined ? undefined : selectableNode(path);
    if (!node) {
      clearHover();
      return;
    }
    const indexPath = indexPathOf(path, node);
    if (indexPath && selectedPath && indexPath.join() === selectedPath.join()) {
      clearHover();
      return;
    }
    const blockOffset = node.position?.start.offset;
    const el =
      blockOffset === undefined
        ? null
        : surface.querySelector(`[data-mdx-pos="${blockOffset}"]`);
    const label = "name" in node && node.name ? String(node.name) : node.type;
    showHover(el ?? undefined, label);
  };

  // --- prose in-place editing ------------------------------------------------------
  const startProse = (block: ProseBlock, el: Element, path: IndexPath): void => {
    canvas.highlight(undefined);
    showHover(undefined, undefined);
    renderToolbar();
    el.replaceChildren();
    const handle = mountProseEditor(el, {
      nodes: block.children,
      onChange: (nodes: PhrasingContent[]) => {
        block.children = nodes;
        onChange?.(serializeMdx(doc));
        markDirty();
      },
    });
    handle.view.focus();
    prose = { handle, el, path };
    showFormatBar(el);
  };

  // The format bar floats just above the text being edited; mark intents route through the
  // same prose marks the keymap uses, so there is one editing model.
  function showFormatBar(el: Element): void {
    formatHost.style.top = `${Math.max(surfaceTop(el) - 42, 6)}px`;
    formatHost.style.left = `${surfaceLeft(el)}px`;
    formatHost.style.display = "block";
    const view = () => prose?.handle.view;
    render(
      <FormatBar
        onBold={() => {
          const v = view();
          if (v) toggleProseMark(v, "strong");
        }}
        onItalic={() => {
          const v = view();
          if (v) toggleProseMark(v, "em");
        }}
        onLink={() => {
          const v = view();
          const href = v ? window.prompt("Link URL") : null;
          if (v && href) toggleProseMark(v, "link", { href });
        }}
      />,
      formatHost,
    );
  }

  function hideFormatBar(): void {
    render(null, formatHost);
    formatHost.style.display = "none";
  }

  const commitProse = async (): Promise<IndexPath | undefined> => {
    if (!prose) return undefined;
    const { handle, path } = prose;
    prose = undefined;
    handle.destroy();
    hideFormatBar();
    const next = serializeMdx(doc);
    history.push(next);
    await apply(next, path);
    return path;
  };

  function select(path: IndexPath | undefined): void {
    selectedPath = path;
    canvas.highlight(path);
    renderRail();
    renderToolbar();
  }

  const handleSelect = async (
    selection: CanvasSelection | undefined,
  ): Promise<void> => {
    if (prose) await commitProse();
    const node = selection ? selectableNode(selection.path) : undefined;
    select(node ? indexPathOf(selection?.path ?? [], node) : undefined);
  };

  const handleActivate = (event: Event): void => {
    if (prose) return;
    const el = event.target;
    if (!(el instanceof Element)) return;
    const offset = offsetFromElement(el);
    if (offset === undefined) return;
    const path = nodeAtOffset(doc, offset);
    const block = nearestOfType(path, ["paragraph", "heading"]);
    if (!block || !isProseEditable(block)) return;
    const indexPath = indexPathOf(path, block);
    if (!indexPath) return;
    const blockOffset = block.position?.start.offset;
    const blockEl =
      blockOffset === undefined
        ? null
        : surface.querySelector(`[data-mdx-pos="${blockOffset}"]`);
    if (blockEl) startProse(block, blockEl, indexPath);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && prose) {
      event.preventDefault();
      void commitProse().then(select);
    }
  };

  const handleShortcuts = (event: KeyboardEvent): void => {
    if (isTextEntry(event.target)) return;
    const mod = event.metaKey || event.ctrlKey;
    if (mod && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && event.key === "y") {
      event.preventDefault();
      redo();
      return;
    }
    if (event.key === "Escape" && overlay) {
      closeOverlay();
      return;
    }
    if (prose) return;
    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();
      void moveSelected(-1);
      return;
    }
    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      void moveSelected(1);
      return;
    }
    if ((event.key === "Delete" || event.key === "Backspace") && selectedPath) {
      event.preventDefault();
      void deleteSelected();
    }
  };

  const canvas: CanvasHandle = await mountCanvas({
    target: surface,
    mdx,
    components: componentMap,
    data,
    onSelect: handleSelect,
    suppressWhen: (el) => prose?.el.contains(el) ?? false,
  });
  surface.append(hoverHost, toolbarHost, formatHost);

  surface.addEventListener("dblclick", handleActivate);
  surface.addEventListener("keydown", handleKeydown);
  surface.addEventListener("mousemove", handleHover);
  surface.addEventListener("mouseleave", () => showHover(undefined, undefined));
  surface.addEventListener("dragover", (event) => {
    if (dragFrom) event.preventDefault();
  });
  surface.addEventListener("drop", (event) => void handleDrop(event));
  layout.addEventListener("keydown", handleShortcuts);
  const reposition = (): void => {
    canvas.highlight(selectedPath);
    renderToolbar();
  };
  window.addEventListener("resize", reposition);

  renderChrome();
  renderRail();
  renderOverlays();

  return {
    proseView: () => prose?.handle.view,
    selection: () => selectedPath,
    undo,
    redo,
    dispose() {
      if (publishTimer) clearTimeout(publishTimer);
      prose?.handle.destroy();
      prose = undefined;
      surface.removeEventListener("dblclick", handleActivate);
      surface.removeEventListener("keydown", handleKeydown);
      surface.removeEventListener("mousemove", handleHover);
      layout.removeEventListener("keydown", handleShortcuts);
      window.removeEventListener("resize", reposition);
      canvas.dispose();
      render(null, chromeHost);
      render(null, railHost);
      render(null, toolbarHost);
      render(null, formatHost);
      render(null, hoverHost);
      render(null, modalHost);
      render(null, popoverHost);
      layout.remove();
      style.remove();
      themeStyle.remove();
      fontsLink.remove();
    },
  };
}
