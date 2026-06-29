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
import {
  arrayElementShape,
  type ControlDescriptor,
  enumerateItemPaths,
} from "@nocms/core";
import type { ProseEditorHandle } from "@nocms/prose";
import type { ComponentMap } from "@nocms/renderer";
import { formatTokens, parseTokens, type Token, toCssVariables } from "@nocms/tokens";
import type { Nodes, Parent } from "mdast";
import { render, type VNode } from "preact";
import {
  type CanvasHandle,
  type CanvasSelection,
  mountCanvas,
  offsetFromElement,
} from "./canvas.js";
import type { BreakpointId } from "./chrome.js";
import { createChromeController } from "./chrome-controller.js";
import { EditorChrome } from "./chrome-view.js";
import { anchorComponents } from "./content-anchors.js";
import { createContentEditor } from "./content-edit.js";
import { createDocumentStore } from "./document-store.js";
import { createDragController } from "./drag-controller.js";
import { readFrontmatter } from "./frontmatter.js";
import type { InspectorProps } from "./inspector.js";
import {
  type ItemSelection,
  type ItemTarget,
  parseItemPath,
} from "./item-selection.js";
import {
  getProp,
  getStructuredProp,
  isJsxElement,
  type JsxElement,
  type PropValue,
  removeProp,
  setProp,
  setStructuredProp,
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
import { isInlineTextComponent, isProseEditable } from "./prose-edit.js";
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
  /** Renders an extra "Style" section in the inspector for the selected element. The editor stays
   *  styling-agnostic (invariant #2): the site supplies the panel and owns its styling system; the
   *  editor only exposes the selected element's `class` through `getClass`/`setClass` and slots the
   *  returned view into the rail. Returns null to show nothing for this element. */
  renderStyleSection?: (ctx: StyleSectionContext) => VNode | null;
}

/** What the host's Style section receives: the selected element, its tag/component name, and a
 *  read/write pair for its `class` attribute that goes through the normal edit (serialize + repaint)
 *  path — the host never touches the mdast. */
export interface StyleSectionContext {
  element: JsxElement;
  name: string;
  getClass: () => string;
  setClass: (cls: string) => void;
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
  // The selected array item (a pricing card etc.), when a card — not its component — is the active
  // selection. `selectedPath` still points at the owning component (so the inspector shows its
  // props with the item expanded); this just adds the item-level chrome and drag.
  let selectedItem: ItemSelection | undefined;
  // The content leaf the last click landed on (e.g. `items.2.title`), relative to the selected
  // block — the props panel focuses that field. Cleared on any selection that isn't a content hit.
  let focusedContentPath: string | undefined;
  // Bumped on every content click so re-clicking the *same* leaf (its path unchanged) still
  // re-fires the field focus — the panel keys its focus effect on this, not on the path alone.
  let focusNonce = 0;

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
    // While an item is selected the block highlight is suppressed (the item has its own box), so a
    // re-serialize after an edit doesn't draw a stray outline around the whole component.
    getSelectedPath: () => (selectedItem ? undefined : selectedPath),
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
      focus?: { path: string; nonce: number };
    } | null = null;
    if (node && isJsxElement(node) && node.name) {
      const def = components[node.name];
      const controls = def ? controlsOf(def) : [];
      if (controls.length > 0)
        selected = {
          element: node,
          name: node.name,
          controls,
          focus: focusedContentPath
            ? { path: focusedContentPath, nonce: focusNonce }
            : undefined,
        };
    }
    const styleSection =
      node && isJsxElement(node) && node.name && options.renderStyleSection
        ? options.renderStyleSection({
            element: node,
            name: node.name,
            getClass: () => String(getProp(node, "class") ?? ""),
            setClass: (cls) => {
              if (cls) setProp(node, "class", cls);
              else removeProp(node, "class");
              void handleEdit();
            },
          })
        : null;
    const fm = node ? { title: "", description: "" } : readFrontmatter(docs.doc);
    return {
      selected,
      styleSection,
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
      selectedItem ||
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
      />,
      toolbarHost,
    );
  }

  const handleHover = (event: MouseEvent): void => {
    if (proseSession.isActive() || contentEditor.isActive() || drag.isDragging()) {
      overlays.clearHover();
      overlays.showContentHover(undefined);
      return;
    }
    const t = event.target;
    if (!(t instanceof Element)) return;
    // Content-level hover is independent of the block outline, so an editable leaf still signals
    // it is clickable while inside the selected block. The already-selected leaf is skipped — its
    // selection box is the stronger affordance.
    const anchor = t.closest("[data-nocms-path]");
    overlays.showContentHover(
      anchor && anchor !== contentElement() ? anchor : undefined,
    );
    // Deepest-first: an array-item card hovers as itself (outline + item chip), above its component.
    const hoverItem = itemAt(t);
    if (hoverItem) {
      if (selectedItem && sameItem(selectedItem, hoverItem)) {
        overlays.clearHover();
        return;
      }
      const itemEl = itemElement(hoverItem);
      if (itemEl) {
        overlays.showHover(itemEl, itemLabel(hoverItem));
        return;
      }
    }
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
    // An item's chip replaces the block chip and is its own drag handle (reorders the array).
    if (selectedItem && !proseSession.isActive()) {
      const itemEl = itemElement(selectedItem);
      if (itemEl) {
        overlays.showSelectionLabel(itemEl, itemLabel(selectedItem), (event) =>
          drag.beginItemDrag(event),
        );
        return;
      }
    }
    const node = selectedPath ? nodeAtIndexPath(docs.doc, selectedPath) : undefined;
    const el = selectedPath ? elementAtPath(selectedPath) : null;
    if (
      selectedItem ||
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
    // The chip is the drag handle: grabbing it lifts the block to move it (D22 drag-to-arrange).
    overlays.showSelectionLabel(el, label, (event) => drag.beginDrag(event));
  }

  // The DOM element of the anchored content leaf, scoped to the selected block so an identical
  // path in another block can't match. Re-resolved each call because a repaint replaces the node.
  function contentElement(): Element | null {
    if (!focusedContentPath || !selectedPath) return null;
    const blockEl = elementAtPath(selectedPath);
    return blockEl?.querySelector(`[data-nocms-path="${focusedContentPath}"]`) ?? null;
  }

  function renderContentSelection(): void {
    // `focusedContentPath` is checked first so this is safe to call from the canvas's first paint,
    // before `proseSession` exists: with nothing anchored the prose check is never evaluated.
    if (!focusedContentPath || proseSession.isActive() || contentEditor.isActive()) {
      overlays.showContentSelection(undefined);
      return;
    }
    overlays.showContentSelection(contentElement() ?? undefined);
  }

  // Array items — a card derived from an object-array prop, selectable and draggable on the canvas
  // (deepest-first: a card sits below its component). Detection is `data-nocms-item`, tagged by the
  // content-anchor pass; the item reorders within its own array prop, not the document tree.
  function itemAt(el: Element): ItemSelection | undefined {
    const itemEl = el.closest<HTMLElement>("[data-nocms-item]");
    const raw = itemEl?.dataset.nocmsItem;
    const parsed = raw ? parseItemPath(raw) : undefined;
    if (!itemEl || !raw || !parsed) return undefined;
    const compEl = itemEl.closest("[data-mdx-pos]");
    const offset = compEl ? Number(compEl.getAttribute("data-mdx-pos")) : Number.NaN;
    if (Number.isNaN(offset)) return undefined;
    const chain = nodeAtOffset(docs.doc, offset);
    const compNode = chain.findLast(
      (n) => isJsxElement(n) && n.position?.start.offset === offset,
    );
    const component = compNode ? indexPathOf(chain, compNode) : undefined;
    if (!component) return undefined;
    return { component, key: parsed.key, index: parsed.index, path: raw };
  }

  function itemElement(item: ItemSelection): Element | null {
    return (
      elementAtPath(item.component)?.querySelector(
        `[data-nocms-item="${item.path}"]`,
      ) ?? null
    );
  }

  // An item's key is a dotted path; it is reordered by rewriting its *top-level* prop (the first
  // segment) with the nested array spliced, since `setStructuredProp` writes whole attributes. A
  // nested feature `tiers.0.features.2` rewrites `tiers`; a top-level `tiers.1` rewrites `tiers`.
  const splitItemKey = (key: string): { topKey: string; rest: string[] } => {
    const segs = key.split(".");
    return { topKey: segs[0] ?? key, rest: segs.slice(1) };
  };
  const navigate = (root: unknown, segs: string[]): unknown =>
    segs.reduce<unknown>(
      (cur, s) => (cur == null ? undefined : (cur as Record<string, unknown>)[s]),
      root,
    );

  // A node's props the way the canvas renders them: stored attributes where present, else schema
  // defaults — the resolution the props panel and content-anchor probe also use.
  function resolveProps(
    node: JsxElement,
    controls: ControlDescriptor[],
  ): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const control of controls) {
      if (control.kind === "group" || control.kind === "list") {
        props[control.key] =
          getStructuredProp(node, control.key) ??
          control.default ??
          (control.kind === "list" ? [] : {});
      } else {
        const v = getProp(node, control.key);
        props[control.key] = v !== undefined ? v : control.default;
      }
    }
    return props;
  }

  // The resolved value of a node's top-level prop, falling back to the schema default when the prop
  // isn't stored — a section often renders its seed array with no attribute, and reading only stored
  // attributes would miss it (a reorder would silently no-op).
  function resolvedTopValue(node: JsxElement, topKey: string): unknown {
    const stored = getStructuredProp(node, topKey);
    if (stored !== undefined) return stored;
    const def = node.name ? components[node.name] : undefined;
    return def ? controlsOf(def).find((c) => c.key === topKey)?.default : undefined;
  }

  function resolvedTop(item: ItemSelection): unknown {
    const node = nodeAtIndexPath(docs.doc, item.component);
    if (!node || !isJsxElement(node)) return undefined;
    return resolvedTopValue(node, splitItemKey(item.key).topKey);
  }

  // The array an item sits in, at any depth — for labelling and reordering.
  function resolvedArray(item: ItemSelection): unknown[] | undefined {
    const arr = navigate(resolvedTop(item), splitItemKey(item.key).rest);
    return Array.isArray(arr) ? arr : undefined;
  }

  // Every component instance in the document, with its block path — for finding drop targets.
  function forEachComponent(cb: (node: JsxElement, path: IndexPath) => void): void {
    const walk = (node: Nodes, path: IndexPath): void => {
      childrenOf(node).forEach((child, i) => {
        const childPath = [...path, i];
        if (isJsxElement(child) && child.name) cb(child, childPath);
        walk(child, childPath);
      });
    };
    walk(docs.doc, []);
  }

  // Drop targets for an item drag: its own array (in-place reorder) plus every other array in the
  // document whose element is the *same shape* — so a feature can move to another tier's features or
  // another Pricing's, but never into a differently-shaped list.
  const itemTargets = (source: ItemSelection): ItemTarget[] => {
    const srcNode = nodeAtIndexPath(docs.doc, source.component);
    const srcDef =
      srcNode && isJsxElement(srcNode) && srcNode.name
        ? components[srcNode.name]
        : undefined;
    const srcShape = srcDef
      ? arrayElementShape(controlsOf(srcDef), source.key)
      : undefined;
    if (!srcShape) return [];
    const targets: ItemTarget[] = [];
    forEachComponent((node, path) => {
      const def = node.name ? components[node.name] : undefined;
      if (!def) return;
      const controls = controlsOf(def);
      const keys = new Set(
        enumerateItemPaths(controls, resolveProps(node, controls)).map((i) => i.key),
      );
      for (const key of keys) {
        if (arrayElementShape(controls, key) === srcShape)
          targets.push({ component: path, key });
      }
    });
    return targets;
  };

  // The chip text for an item: a string element verbatim (a feature), else its first non-empty text
  // field (a tier's name), else a positional fallback — legible without a declared label field.
  function itemLabel(item: ItemSelection): string {
    const val = resolvedArray(item)?.[item.index];
    if (typeof val === "string" && val.trim()) return val.trim().slice(0, 28);
    if (val && typeof val === "object") {
      for (const v of Object.values(val as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim()) return v.trim().slice(0, 28);
      }
    }
    return `${item.key} ${item.index + 1}`;
  }

  const sameItem = (a: ItemSelection, b: ItemSelection): boolean =>
    a.path === b.path && a.component.join() === b.component.join();

  function renderItemSelection(): void {
    if (!selectedItem || proseSession.isActive()) {
      overlays.showItemSelection(undefined);
      return;
    }
    overlays.showItemSelection(itemElement(selectedItem) ?? undefined);
  }

  function selectItem(item: ItemSelection): void {
    selectedItem = item;
    selectedPath = item.component; // the inspector shows the owning component...
    focusedContentPath = item.path; // ...with this item's row expanded
    focusNonce += 1;
    canvas.highlight(undefined);
    paint();
    renderToolbar();
    renderSelectionLabel();
    renderItemSelection();
    renderContentSelection();
  }

  // Move an item into `target` at `to` — the source's own array (in-place reorder, the props
  // panel's up/down write) or a same-shaped array elsewhere (a feature to another tier, or another
  // component). The item is removed from its source array and inserted into the target; when both
  // share one top-level prop on one node it is a single clone+write, else each node's prop is
  // rewritten. The moved item stays selected at its destination.
  const moveItem = async (
    source: ItemSelection,
    target: ItemTarget,
    to: number,
  ): Promise<void> => {
    const srcNode = nodeAtIndexPath(docs.doc, source.component);
    const tgtNode = nodeAtIndexPath(docs.doc, target.component);
    if (!srcNode || !tgtNode || !isJsxElement(srcNode) || !isJsxElement(tgtNode))
      return;
    const src = splitItemKey(source.key);
    const tgt = splitItemKey(target.key);
    const sameProp =
      source.component.join() === target.component.join() && src.topKey === tgt.topKey;

    // `removeFrom` mutates its clone and returns the lifted value; `insertInto` mutates and returns
    // the clamped landing index. When source and target share one prop they share one clone so both
    // edits land together; the source array stays referenced after the target navigation.
    const srcTop = structuredClone(resolvedTopValue(srcNode, src.topKey));
    const srcArr = navigate(srcTop, src.rest);
    if (!Array.isArray(srcArr) || source.index < 0 || source.index >= srcArr.length)
      return;
    const tgtTop = sameProp
      ? srcTop
      : structuredClone(resolvedTopValue(tgtNode, tgt.topKey));
    const [moved] = srcArr.splice(source.index, 1);
    const tgtArr = navigate(tgtTop, tgt.rest);
    if (!Array.isArray(tgtArr)) return;
    const at = Math.max(0, Math.min(to, tgtArr.length));
    tgtArr.splice(at, 0, moved);

    setStructuredProp(srcNode, src.topKey, srcTop);
    if (!sameProp) setStructuredProp(tgtNode, tgt.topKey, tgtTop);
    // `commit` (not `handleEdit`) re-parses the document so its source offsets re-sync with the
    // re-rendered canvas — selection resolves a clicked DOM offset against this tree, and a stale
    // one breaks all selection. It block-selects the component, so re-select the moved item.
    await docs.commit(docs.serialize(), target.component);
    selectItem({
      component: target.component,
      key: target.key,
      index: at,
      path: `${target.key}.${at}`,
    });
  };

  function select(path: IndexPath | undefined, focus?: string): void {
    selectedItem = undefined;
    overlays.showItemSelection(undefined);
    selectedPath = path;
    // Cleared unless this selection came from clicking tagged content, so a stale field focus
    // never lingers onto the next block.
    focusedContentPath = focus;
    if (focus) focusNonce += 1;
    canvas.highlight(path);
    paint();
    renderToolbar();
    renderSelectionLabel();
    renderContentSelection();
  }

  const handleSelect = async (
    selection: CanvasSelection | undefined,
  ): Promise<void> => {
    if (proseSession.isActive()) await proseSession.commit();
    if (contentEditor.isActive()) await contentEditor.commit();
    // Deepest-first: a click inside an array-item card selects that item, not the whole component.
    const item = selection ? itemAt(selection.element) : undefined;
    if (item) {
      selectItem(item);
      return;
    }
    const node = selection ? selectableNode(selection.path) : undefined;
    const anchor = selection?.element.closest("[data-nocms-path]");
    const focus = anchor?.getAttribute("data-nocms-path") ?? undefined;
    select(node ? indexPathOf(selection?.path ?? [], node) : undefined, focus);
  };

  // The rendered element a `data-mdx-pos` carrier wraps: a component sits in a `display:contents`
  // carrier, so its single child is the real box we mount the inline editor into (keeping the
  // component's own styling — e.g. the badge pill — around the text being typed).
  const renderedAt = (offset: number): Element | null => {
    const carrier = surface.querySelector(`[data-mdx-pos="${offset}"]`);
    if (!carrier) return null;
    return getComputedStyle(carrier).display === "contents"
      ? (carrier.firstElementChild ?? carrier)
      : carrier;
  };

  const handleActivate = (event: Event): void => {
    if (proseSession.isActive() || contentEditor.isActive()) return;
    const el = event.target;
    if (!(el instanceof Element)) return;

    // A content leaf mapped to a prop (`data-nocms-path`): edit it directly on the page, writing
    // back to the same prop the panel edits. These are plain strings, so plain contenteditable.
    const leaf = el.closest("[data-nocms-path]");
    if (leaf instanceof HTMLElement && leaf.dataset.nocmsPath) {
      const leafOffset = offsetFromElement(leaf);
      const owner =
        leafOffset === undefined
          ? undefined
          : nodeAtOffset(docs.doc, leafOffset).findLast(isJsxElement);
      if (owner?.name) {
        const def = components[owner.name];
        contentEditor.start(
          leaf,
          owner,
          leaf.dataset.nocmsPath,
          def ? controlsOf(def) : [],
        );
        return;
      }
    }

    const offset = offsetFromElement(el);
    if (offset === undefined) return;
    const path = nodeAtOffset(docs.doc, offset);

    // An inline component (a Badge, …) is edited as itself: just its text, in place — not the
    // paragraph that happens to hold a whole row of them.
    const inline = nearestOfType(path, ["mdxJsxTextElement"]);
    if (inline && isInlineTextComponent(inline)) {
      const inlinePath = indexPathOf(path, inline);
      const inlineEl =
        inline.position?.start.offset === undefined
          ? null
          : renderedAt(inline.position.start.offset);
      if (inlinePath && inlineEl) {
        proseSession.start(inline, inlineEl, inlinePath, true);
        return;
      }
    }

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
      return;
    }
    if (contentEditor.isActive()) {
      // Inline content is single-line plain text: Enter commits rather than inserting a newline;
      // Escape abandons the edit and restores the original.
      if (event.key === "Enter") {
        event.preventDefault();
        void contentEditor.commit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        contentEditor.cancel();
      }
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
    if (event.key === "Escape") {
      if (overlay) {
        closeOverlay();
        return;
      }
      if (proseSession.isActive() || contentEditor.isActive() || drag.isDragging())
        return;
      // Zoom out the selection one level — easier than clicking past the deepest thing under the
      // cursor: a card → its component → the parent container → … → nothing.
      if (selectedItem) {
        event.preventDefault();
        select(selectedItem.component);
        return;
      }
      if (selectedPath && selectedPath.length > 0) {
        event.preventDefault();
        const parent = selectedPath.slice(0, -1);
        select(parent.length > 0 ? parent : undefined);
        return;
      }
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
    onPainted: (content, doc) => {
      anchorComponents(content, doc, components);
      // The repaint replaced the anchored nodes; re-pin the content box and any item chrome to the
      // fresh ones (the item's card is re-tagged by anchorComponents above).
      renderContentSelection();
      renderItemSelection();
      renderSelectionLabel();
    },
    // The selection chip lives in the overlay layer (a child of the canvas) and is the drag
    // handle; a click on it must not reach the canvas, which would read it as empty space and
    // deselect the block being grabbed.
    suppressWhen: (el) =>
      proseSession.containsEl(el) ||
      contentEditor.containsEl(el) ||
      overlays.labelHost.contains(el),
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
    isContainer: (name) => Boolean(components[name]?.slots?.length),
    reorder: async (from, parent, to) => {
      const next = moveNode(docs.doc, from, parent, to);
      await docs.commit(serializeMdx(next), [...parent, to]);
    },
    selectedItem: () => selectedItem,
    itemElement,
    itemTargets,
    moveItem,
    restore: () => {
      if (selectedItem) {
        renderItemSelection();
        renderSelectionLabel();
        return;
      }
      canvas.highlight(selectedPath);
      renderToolbar();
      renderSelectionLabel();
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
    onStart: () => {
      renderToolbar();
      renderContentSelection();
    },
  });

  // Inline editing of prop-backed content (a `data-nocms-path` leaf) directly on the page,
  // writing back to the same prop the panel edits.
  const contentEditor = createContentEditor({
    docs,
    canvas,
    onStart: () => {
      renderToolbar();
      renderContentSelection();
    },
    // Repaint only the chrome (panel), not the canvas, so the panel field tracks the live text
    // while the contenteditable stays intact under the caret.
    refreshPanel: () => paint(),
    markDirty: () => chrome.markDirty(),
  });

  surface.addEventListener("dblclick", handleActivate);
  surface.addEventListener("keydown", handleKeydown);
  surface.addEventListener("mousemove", handleHover);
  surface.addEventListener("mouseleave", () => {
    overlays.clearHover();
    overlays.showContentHover(undefined);
  });
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
    // A lift hides the toolbar/chip/highlight and the drag controller owns the overlays; a reflow
    // mid-drag must not re-pin them and fight the gesture.
    if (drag.isDragging()) return;
    if (selectedItem) {
      canvas.highlight(undefined);
      renderItemSelection();
      renderSelectionLabel();
      return;
    }
    canvas.highlight(selectedPath);
    renderToolbar();
    renderSelectionLabel();
    renderContentSelection();
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
      contentEditor.dispose();
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
