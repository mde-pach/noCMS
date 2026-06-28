// The editor's wiring layer: build the canvas and the controllers, then connect them. State is
// owned by controllers (document store, chrome, prose, drag, overlays), not shared in this
// closure — add features as/to a controller so this file doesn't grow back into a 1000-line tangle.

import {
  type ComponentManifest,
  type ComponentRegistry,
  controlsOf,
  registryManifest,
  type SavedDef,
  savedDefToBlock,
} from "@nocms/components";
import type { ControlDescriptor } from "@nocms/core";
import type { ProseEditorHandle } from "@nocms/prose";
import type { ComponentMap } from "@nocms/renderer";
import { formatTokens, parseTokens, type Token, toCssVariables } from "@nocms/tokens";
import type { Nodes, Parent } from "mdast";
import { render } from "preact";
import {
  type CanvasHandle,
  type CanvasSelection,
  mountCanvas,
  offsetFromElement,
} from "./canvas.js";
import type { BreakpointId } from "./chrome.js";
import { createChromeController } from "./chrome-controller.js";
import { EditorChrome } from "./chrome-view.js";
import { createDocumentStore } from "./document-store.js";
import { createDragController } from "./drag-controller.js";
import { readFrontmatter } from "./frontmatter.js";
import type { InspectorProps } from "./inspector.js";
import {
  getProp,
  isJsxElement,
  type JsxElement,
  type PropValue,
  setProp,
} from "./jsx-attributes.js";
import { serializeMdx } from "./mdx-document.js";
import type { ModalProps, OverlayKind, SaveDialogData } from "./modals.js";
import type { NavSection } from "./navigator.js";
import { createOverlayLayer } from "./overlays.js";
import {
  type IndexPath,
  indexPathOf,
  nearestOfType,
  nodeAtIndexPath,
  nodeAtOffset,
} from "./position.js";
import { createProseController } from "./prose-controller.js";
import { isProseEditable } from "./prose-edit.js";
import { buildSavedComponentDef } from "./save-component-action.js";
import { selectableNode } from "./selectable.js";
import { SelectionToolbar } from "./selection-toolbar.js";
import { EDITOR_CSS, FONTS_HREF } from "./theme.js";
import { TokensPanel } from "./tokens-panel.js";
import { moveNode } from "./tree-edit.js";

// A breakpoint resizes the *whole page* (`#app`, via `--nocms-page-width`), not just the content
// column — so the header and nav reflow exactly as they would at that real viewport width, the way
// a device actually renders the site. L4 ("Fit") fills the available stage and is the faithful
// default (what visitors see, minus the docked rail); the narrower steps are real device widths,
// centred on the editor backdrop so the page reads as a device preview.
const BREAKPOINT_WIDTH: Record<BreakpointId, string> = {
  L0: "390px",
  L1: "600px",
  L2: "834px",
  L3: "1280px",
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
  /** @deprecated controls are now derived from each block's schema; ignored. */
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
  const initialMdx = mdx;
  const initialTokensSrc = options.tokens;

  // Modal + rail state; the top-bar state lives in the chrome controller.
  let overlay: OverlayKind | null = null;
  let mediaTarget: { element: JsxElement; key: string } | undefined;
  let saveTarget: { node: JsxElement; path: IndexPath; container: boolean } | undefined;
  let brandExpanded = false;
  let tokens: Token[] = options.tokens !== undefined ? parseTokens(options.tokens) : [];

  // The editor is an overlay over the live page, not a frame around it: the page's content host
  // (`target`) *is* the editing surface, and the chrome (top bar, rail, modals, popovers) mounts
  // into a fixed layer above it. Entering edit adds `nocms-editing` to <html>, which slides the
  // chrome in and offsets the page — a transition over what is already on screen.
  // The host may have already injected the chrome stylesheet (e.g. for a sign-in gate shown
  // before the editor); reuse it so there is one tag, and only this mount removes what it owns.
  const existingStyle = document.getElementById(
    "nocms-editor-css",
  ) as HTMLStyleElement | null;
  const style = existingStyle ?? document.createElement("style");
  const ownsStyle = !existingStyle;
  if (ownsStyle) {
    style.id = "nocms-editor-css";
    style.textContent = EDITOR_CSS;
    document.head.appendChild(style);
  }
  const existingFonts = document.querySelector("link[data-nocms-fonts]");
  const fontsLink =
    (existingFonts as HTMLLinkElement | null) ?? document.createElement("link");
  const ownsFonts = !existingFonts;
  if (ownsFonts) {
    fontsLink.rel = "stylesheet";
    fontsLink.href = FONTS_HREF;
    fontsLink.setAttribute("data-nocms-fonts", "");
    document.head.appendChild(fontsLink);
  }

  const surface = target as HTMLElement;
  surface.classList.add("nocms-canvas");

  // The fixed chrome is one declarative tree painted into `chromeRoot` (top bar + rail + modal +
  // popover). The toolbar/format hosts are the positioned, geometry-tracked overlays in the
  // content surface, so they stay separate.
  const chromeRoot = document.createElement("div");
  chromeRoot.className = "nocms-editor";
  const toolbarHost = document.createElement("div");
  toolbarHost.className = "nocms-toolbar-host";
  const formatHost = document.createElement("div");
  formatHost.className = "nocms-toolbar-host";
  const overlays = createOverlayLayer(surface);
  document.body.append(chromeRoot);

  // Runtime theming: a single <style> the design panel rewrites live (no rebuild).
  const themeStyle = document.createElement("style");
  if (options.tokens !== undefined) {
    themeStyle.textContent = toCssVariables(tokens);
    document.head.append(themeStyle);
  }

  let selectedPath: IndexPath | undefined;

  // The top-bar state (breakpoint, appearance, dirty, publish) — its own concern; mutations
  // repaint the chrome tree. The actions it triggers (reset, open navigator/publish) are wired
  // into the chrome view by `paint`.
  const chrome = createChromeController({
    surface,
    breakpointWidth: BREAKPOINT_WIDTH,
    onBreakpointChange: () => trackOverlays(360),
    repaint: () => paint(),
  });

  // The document model + history + every tree command live in the store; the shell reads
  // `docs.doc` and calls commands, but owns none of that state.
  const docs = createDocumentStore({
    initialMdx,
    // `canvas` is assigned below (mountCanvas); the store only calls it after mount.
    getCanvas: () => canvas,
    select: (path) => select(path),
    getSelectedPath: () => selectedPath,
    onChange,
    markDirty: () => chrome.markDirty(),
  });

  // The floating toolbar and format bar share the overlay layer's surface-relative geometry.
  const { surfaceTop, surfaceLeft } = overlays;

  const elementAtPath = (path: IndexPath): Element | null => {
    const offset = nodeAtIndexPath(docs.doc, path)?.position?.start.offset;
    return offset === undefined
      ? null
      : surface.querySelector(`[data-mdx-pos="${offset}"]`);
  };

  // One declarative chrome tree (see chrome-view), painted from a state snapshot.
  const brandPanel = (): ReturnType<typeof TokensPanel> | null => {
    if (tokens.length === 0) return null;
    return (
      <TokensPanel
        tokens={tokens}
        onChange={(next, flat, css) => {
          tokens = next;
          themeStyle.textContent = css;
          onTokensChange?.(flat);
          chrome.markDirty();
          paint();
        }}
      />
    );
  };

  function inspectorProps(): InspectorProps {
    const node =
      selectedPath && selectedPath.length > 0
        ? nodeAtIndexPath(docs.doc, selectedPath)
        : undefined;
    let selected: {
      element: JsxElement;
      name: string;
      controls: ControlDescriptor[];
    } | null = null;
    if (node && isJsxElement(node) && node.name) {
      const def = components[node.name];
      const controls = def ? controlsOf(def) : [];
      if (controls.length > 0) selected = { element: node, name: node.name, controls };
    }
    const fm = node ? { title: "", description: "" } : readFrontmatter(docs.doc);
    return {
      selected,
      selectedEmpty: node !== undefined && selected === null,
      onEdit: handleEdit,
      onPickImage: (key) => node && openMedia(node as JsxElement, key),
      pageName: options.pageName ?? "Home",
      title: fm.title,
      description: fm.description,
      onTitle: (v) => editFrontmatter("title", v),
      onDescription: (v) => editFrontmatter("description", v),
      brandExpanded,
      onToggleBrand: () => {
        brandExpanded = !brandExpanded;
        paint();
      },
      brandPanel: brandPanel(),
      onAddSection: openCatalog,
    };
  }

  function modalProps(): ModalProps {
    return {
      overlay,
      pageName: options.pageName ?? "Home",
      manifests: registryManifest(components),
      sections: sectionOutline(),
      saveDialog: saveDialogData(),
      onInsert: (manifest) => void handleInsert(manifest),
      onSelectSection: (index) => {
        select([index]);
        closeOverlay();
      },
      onPickMedia: (url) => void chooseMedia(url),
      onSaveComponent: (name, exposed, slot) =>
        void saveAsComponent(name, exposed, slot),
      onClose: closeOverlay,
    };
  }

  function paint(): void {
    const c = chrome.snapshot();
    render(
      <EditorChrome
        siteHost={options.siteHost ?? "nocms.github.io"}
        pageName={options.pageName ?? "Home"}
        breakpoint={c.breakpoint}
        appearance={c.appearance}
        dirty={c.dirty}
        publishStatus={c.publishStatus}
        onBreakpoint={chrome.setBreakpoint}
        onAppearance={chrome.toggleAppearance}
        onReset={() => void resetEdits()}
        onTogglePublish={togglePublish}
        onMenu={openNavigator}
        inspector={inspectorProps()}
        modal={modalProps()}
        publishOpen={overlay === "publish"}
        publishChanges={chrome.changeset()}
        onPublishConfirm={runPublish}
        onClosePublish={closeOverlay}
      />,
      chromeRoot,
    );
  }

  function sectionOutline(): NavSection[] {
    const sel = selectedPath?.length === 1 ? selectedPath[0] : undefined;
    return docs.doc.children.flatMap((node, index) => {
      if (node.type === "yaml") return [];
      const label = "name" in node && node.name ? String(node.name) : node.type;
      return [{ label, index, selected: index === sel }];
    });
  }

  // The save-as-component dialog's data, computed from the selection (controls + current values +
  // a live preview snapshot); null unless that dialog is open.
  function saveDialogData(): SaveDialogData | null {
    if (overlay !== "save-component" || !saveTarget) return null;
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
    return {
      base,
      controls,
      values,
      previewHtml: elementAtPath(saveTarget.path)?.outerHTML,
      container: saveTarget.container,
    };
  }

  // The top-bar "Publish" opens this popover; its confirm runs the (stubbed) publish.
  const togglePublish = (): void => {
    overlay = overlay === "publish" ? null : "publish";
    paint();
  };

  const runPublish = (): void => {
    overlay = null;
    paint();
    chrome.beginPublish();
  };

  async function resetEdits(): Promise<void> {
    if (initialTokensSrc !== undefined) {
      tokens = parseTokens(initialTokensSrc);
      themeStyle.textContent = toCssVariables(tokens);
      onTokensChange?.(formatTokens(tokens));
    }
    await docs.commit(initialMdx, undefined);
    chrome.reset();
  }

  const openCatalog = (): void => {
    overlay = "catalog";
    paint();
  };
  const openNavigator = (): void => {
    overlay = "navigator";
    paint();
  };
  const openMedia = (element: JsxElement, key: string): void => {
    mediaTarget = { element, key };
    overlay = "media";
    paint();
  };
  const chooseMedia = async (url: string): Promise<void> => {
    if (mediaTarget) {
      setProp(mediaTarget.element, mediaTarget.key, url);
      mediaTarget = undefined;
      overlay = null;
      paint();
      await handleEdit();
    }
  };
  const closeOverlay = (): void => {
    overlay = null;
    mediaTarget = undefined;
    saveTarget = undefined;
    paint();
  };

  const openSaveComponent = (): void => {
    const node = selectedPath ? nodeAtIndexPath(docs.doc, selectedPath) : undefined;
    if (!node || !selectedPath || !isJsxElement(node) || !node.name) return;
    const def = components[node.name];
    if (!def || controlsOf(def).length === 0) return;
    saveTarget = {
      node,
      path: selectedPath,
      container: childrenOf(node).length > 0,
    };
    overlay = "save-component";
    paint();
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

    const { def, props } = buildSavedComponentDef({
      name,
      base,
      baseDef,
      node,
      exposed,
      slot,
    });
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
    paint();
    await docs.commit(docs.serialize(), path);
    // The instance has now rendered; snapshot it so the catalog card shows the real component.
    const rendered = elementAtPath(path);
    const block = components[name];
    if (rendered && block) block.preview = rendered.outerHTML;
  };

  // Document-edit call sites; the model + history live in `docs`.
  const editFrontmatter = (key: string, value: string): void =>
    docs.editFrontmatter(key, value);
  const handleEdit = (): Promise<void> => docs.handleEdit();
  const deleteSelected = (): Promise<void> => docs.remove(selectedPath);
  const duplicateSelected = (): Promise<void> => docs.duplicate(selectedPath);
  const moveSelected = (direction: -1 | 1): Promise<void> =>
    docs.move(selectedPath, direction);

  const handleInsert = async (manifest: ComponentManifest): Promise<void> => {
    if (proseSession.isActive()) await proseSession.commit();
    overlay = null;
    paint();
    await docs.insertManifest(manifest, selectedPath);
  };

  function renderToolbar(): void {
    const node = selectedPath ? nodeAtIndexPath(docs.doc, selectedPath) : undefined;
    if (
      !node ||
      !selectedPath ||
      selectedPath.length === 0 ||
      proseSession.isActive()
    ) {
      render(null, toolbarHost);
      toolbarHost.style.display = "none";
      return;
    }
    const parentPath = selectedPath.slice(0, -1);
    const from = selectedPath[selectedPath.length - 1] ?? 0;
    const count = docs.childCountAt(parentPath);
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
        onSettings={() =>
          (
            document.querySelector(".nocms-editor-panel") as HTMLElement | null
          )?.scrollTo({
            top: 0,
          })
        }
        onSaveAsComponent={saveable ? openSaveComponent : undefined}
        onDragStart={(event) => drag.beginDrag(event)}
        onDragEnd={() => drag.endDrag()}
      />,
      toolbarHost,
    );
  }

  const handleHover = (event: MouseEvent): void => {
    if (proseSession.isActive() || drag.isDragging()) {
      overlays.clearHover();
      return;
    }
    const t = event.target;
    if (!(t instanceof Element)) return;
    const offset = offsetFromElement(t);
    const path = offset === undefined ? [] : nodeAtOffset(docs.doc, offset);
    const node = offset === undefined ? undefined : selectableNode(path);
    if (!node) {
      overlays.clearHover();
      return;
    }
    const indexPath = indexPathOf(path, node);
    if (indexPath && selectedPath && indexPath.join() === selectedPath.join()) {
      overlays.clearHover();
      return;
    }
    const blockOffset = node.position?.start.offset;
    const el =
      blockOffset === undefined
        ? null
        : surface.querySelector(`[data-mdx-pos="${blockOffset}"]`);
    const label = "name" in node && node.name ? String(node.name) : node.type;
    overlays.showHover(el ?? undefined, label);
  };

  // The block's name tag, anchored just above the selection's top-left so it labels the
  // selection without ever overlapping the content inside it.
  function renderSelectionLabel(): void {
    const node = selectedPath ? nodeAtIndexPath(docs.doc, selectedPath) : undefined;
    const el = selectedPath ? elementAtPath(selectedPath) : null;
    if (
      !node ||
      !selectedPath ||
      selectedPath.length === 0 ||
      proseSession.isActive() ||
      !el
    ) {
      overlays.showSelectionLabel(undefined, undefined);
      return;
    }
    const label = "name" in node && node.name ? String(node.name) : node.type;
    overlays.showSelectionLabel(el, label);
  }

  function select(path: IndexPath | undefined): void {
    selectedPath = path;
    canvas.highlight(path);
    paint();
    renderToolbar();
    renderSelectionLabel();
  }

  const handleSelect = async (
    selection: CanvasSelection | undefined,
  ): Promise<void> => {
    if (proseSession.isActive()) await proseSession.commit();
    const node = selection ? selectableNode(selection.path) : undefined;
    select(node ? indexPathOf(selection?.path ?? [], node) : undefined);
  };

  const handleActivate = (event: Event): void => {
    if (proseSession.isActive()) return;
    const el = event.target;
    if (!(el instanceof Element)) return;
    const offset = offsetFromElement(el);
    if (offset === undefined) return;
    const path = nodeAtOffset(docs.doc, offset);
    const block = nearestOfType(path, ["paragraph", "heading"]);
    if (!block || !isProseEditable(block)) return;
    const indexPath = indexPathOf(path, block);
    if (!indexPath) return;
    const blockOffset = block.position?.start.offset;
    const blockEl =
      blockOffset === undefined
        ? null
        : surface.querySelector(`[data-mdx-pos="${blockOffset}"]`);
    if (blockEl) proseSession.start(block, blockEl, indexPath);
  };

  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && proseSession.isActive()) {
      event.preventDefault();
      void proseSession.commit().then(select);
    }
  };

  const handleShortcuts = (event: KeyboardEvent): void => {
    if (isTextEntry(event.target)) return;
    const mod = event.metaKey || event.ctrlKey;
    if (mod && (event.key === "z" || event.key === "Z")) {
      event.preventDefault();
      if (event.shiftKey) docs.redo();
      else docs.undo();
      return;
    }
    if (mod && event.key === "y") {
      event.preventDefault();
      docs.redo();
      return;
    }
    if (event.key === "Escape" && overlay) {
      closeOverlay();
      return;
    }
    if (proseSession.isActive()) return;
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
    suppressWhen: (el) => proseSession.containsEl(el),
  });
  surface.append(toolbarHost, formatHost);

  const drag = createDragController({
    surface,
    overlays,
    toolbarHost,
    canvas,
    getDoc: () => docs.doc,
    selectedPath: () => selectedPath,
    elementAtPath,
    reorder: async (from, parent, to) => {
      const next = moveNode(docs.doc, from, parent, to);
      await docs.commit(serializeMdx(next), [...parent, to]);
    },
  });

  // In-place text editing; `onStart` hides the selection toolbar while a session is open.
  const proseSession = createProseController({
    formatHost,
    overlays,
    canvas,
    docs,
    onChange,
    markDirty: () => chrome.markDirty(),
    onStart: () => renderToolbar(),
  });

  surface.addEventListener("dblclick", handleActivate);
  surface.addEventListener("keydown", handleKeydown);
  surface.addEventListener("mousemove", handleHover);
  surface.addEventListener("mouseleave", () => overlays.clearHover());
  surface.addEventListener("dragover", (event) => drag.onDragOver(event));
  surface.addEventListener("drop", (event) => void drag.onDrop(event));
  // Shortcuts are global (selection lives on the page, not in a focused frame); isTextEntry
  // keeps them from firing while typing in a field or the prose view.
  document.addEventListener("keydown", handleShortcuts);
  // Overlays are positioned against the live page, so any reflow — web fonts landing, an image
  // loading, a breakpoint resize, an edit — moves the element out from under them. One reposition
  // re-pins them all; a ResizeObserver on the surface catches reflow the scroll/resize listeners
  // miss (this is what kept the selection box drifting off its block before).
  const reposition = (): void => {
    if (proseSession.isActive()) {
      proseSession.reposition();
      return;
    }
    canvas.highlight(selectedPath);
    renderToolbar();
    renderSelectionLabel();
  };
  let trackRaf: number | undefined;
  function trackOverlays(ms: number): void {
    const start = performance.now();
    const step = (now: number): void => {
      reposition();
      trackRaf = now - start < ms ? requestAnimationFrame(step) : undefined;
    };
    if (trackRaf !== undefined) cancelAnimationFrame(trackRaf);
    trackRaf = requestAnimationFrame(step);
  }
  const overlayObserver = new ResizeObserver(() => reposition());
  overlayObserver.observe(surface);
  window.addEventListener("resize", reposition);
  window.addEventListener("scroll", reposition, { passive: true });

  paint();

  // Play the enter transition after the chrome has painted: the bar slides down, the rail in,
  // and the page offsets to make room — over the live page, never a reload.
  requestAnimationFrame(() => document.documentElement.classList.add("nocms-editing"));

  return {
    proseView: () => proseSession.view(),
    selection: () => selectedPath,
    undo: () => docs.undo(),
    redo: () => docs.redo(),
    dispose() {
      chrome.dispose();
      proseSession.dispose();
      surface.removeEventListener("dblclick", handleActivate);
      surface.removeEventListener("keydown", handleKeydown);
      surface.removeEventListener("mousemove", handleHover);
      document.removeEventListener("keydown", handleShortcuts);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition);
      overlayObserver.disconnect();
      if (trackRaf !== undefined) cancelAnimationFrame(trackRaf);
      drag.endDrag();
      canvas.dispose();
      render(null, chromeRoot);
      render(null, toolbarHost);
      render(null, formatHost);
      overlays.dispose();
      document.documentElement.classList.remove("nocms-editing");
      document.documentElement.style.removeProperty("--nocms-page-width");
      surface.classList.remove("nocms-canvas");
      toolbarHost.remove();
      formatHost.remove();
      chromeRoot.remove();
      if (ownsStyle) style.remove();
      themeStyle.remove();
      if (ownsFonts) fontsLink.remove();
    },
  };
}
