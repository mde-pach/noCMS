// The app chrome: the top bar and the state it presents — the active breakpoint, light/dark
// appearance, the unsaved-edits flag, and the publish lifecycle. None of this is document or
// selection state, so it lives on its own here; the shell hands it the actions it can't own
// (reset, open navigator, open the publish popover) as callbacks and otherwise leaves it alone.
//
// A breakpoint sizes the whole page via `--nocms-page-width` (the header/nav reflow with it); the
// controller sets that var and asks the shell to re-pin overlays for the width transition.

import { render, type VNode } from "preact";
import {
  type Appearance,
  type BreakpointId,
  type PublishStatus,
  TopBar,
} from "./chrome.js";

export interface ChromeController {
  /** (re)render the top bar from current state. */
  render(): void;
  /** mark the document dirty (called by any edit); re-renders only on the false→true edge. */
  markDirty(): void;
  /** clear dirty + publish state — used by "reset edits". */
  reset(): void;
  /** the publish-popover change list (empty when nothing is dirty). */
  changeset(): { kind: "edit" | "add"; label: string }[];
  /** run the (stubbed) publish: busy → published, clearing dirty. */
  beginPublish(): void;
  /** true while publishing — the shell keeps the popover from reopening. */
  isPublishing(): boolean;
  dispose(): void;
}

export interface ChromeControllerDeps {
  host: Element;
  /** the editing surface — appearance is reflected on its `data-appearance`. */
  surface: HTMLElement;
  siteHost: string;
  pageName: string;
  breakpointWidth: Record<BreakpointId, string>;
  /** the page width transitions on a breakpoint change; re-pin overlays meanwhile. */
  onBreakpointChange: () => void;
  /** open the publish popover (a modal the shell owns). */
  onTogglePublish: () => void;
  /** discard edits (document + tokens) — the shell owns what "reset" touches. */
  onReset: () => void;
  /** open the pages/structure navigator (a modal the shell owns). */
  onMenu: () => void;
}

export function createChromeController(deps: ChromeControllerDeps): ChromeController {
  const { host, surface, siteHost, pageName, breakpointWidth } = deps;
  let breakpoint: BreakpointId = "L4";
  let appearance: Appearance = "light";
  let dirty = false;
  let publishStatus: PublishStatus = "idle";
  let publishTimer: ReturnType<typeof setTimeout> | undefined;

  const setBreakpoint = (bp: BreakpointId): void => {
    breakpoint = bp;
    document.documentElement.style.setProperty(
      "--nocms-page-width",
      breakpointWidth[bp],
    );
    draw();
    deps.onBreakpointChange();
  };

  const toggleAppearance = (): void => {
    appearance = appearance === "light" ? "dark" : "light";
    surface.dataset.appearance = appearance;
    draw();
  };

  const togglePublish = (): void => {
    if (publishStatus === "publishing") return;
    deps.onTogglePublish();
  };

  function chromeTree(): VNode {
    return (
      <TopBar
        siteHost={siteHost}
        pageName={pageName}
        breakpoint={breakpoint}
        onBreakpoint={setBreakpoint}
        appearance={appearance}
        onAppearance={toggleAppearance}
        dirty={dirty}
        onReset={deps.onReset}
        publishStatus={publishStatus}
        onPublish={togglePublish}
        onMenu={deps.onMenu}
        onPagePill={deps.onMenu}
        avatarInitial="A"
      />
    );
  }

  function draw(): void {
    render(chromeTree(), host);
  }

  return {
    render: draw,
    markDirty() {
      if (!dirty) {
        dirty = true;
        draw();
      }
    },
    reset() {
      dirty = false;
      publishStatus = "idle";
      draw();
    },
    changeset() {
      return dirty ? [{ kind: "edit", label: "Unpublished edits on this page" }] : [];
    },
    beginPublish() {
      publishStatus = "publishing";
      draw();
      publishTimer = setTimeout(() => {
        publishStatus = "published";
        dirty = false;
        draw();
      }, 1600);
    },
    isPublishing: () => publishStatus === "publishing",
    dispose() {
      if (publishTimer) clearTimeout(publishTimer);
      render(null, host);
    },
  };
}
