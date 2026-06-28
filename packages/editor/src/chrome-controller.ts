// The app-chrome state: the active breakpoint, light/dark appearance, the unsaved-edits flag, and
// the publish lifecycle. It owns that state and the logic that changes it (sizing the page on a
// breakpoint, the stubbed publish run), but renders nothing — every mutation calls `repaint`, and
// the shell repaints the one declarative chrome tree from `snapshot()`. Keeping it render-free is
// what lets the top bar live in that single tree instead of its own imperative render call.

import type { Appearance, BreakpointId, PublishStatus } from "./chrome.js";

export interface ChromeSnapshot {
  breakpoint: BreakpointId;
  appearance: Appearance;
  dirty: boolean;
  publishStatus: PublishStatus;
}

export interface ChromeController {
  snapshot(): ChromeSnapshot;
  setBreakpoint(bp: BreakpointId): void;
  toggleAppearance(): void;
  markDirty(): void;
  reset(): void;
  changeset(): { kind: "edit" | "add"; label: string }[];
  beginPublish(): void;
  isPublishing(): boolean;
  dispose(): void;
}

export interface ChromeControllerDeps {
  /** the editing surface — appearance is reflected on its `data-appearance`. */
  surface: HTMLElement;
  breakpointWidth: Record<BreakpointId, string>;
  /** the page width transitions on a breakpoint change; the shell re-pins overlays meanwhile. */
  onBreakpointChange: () => void;
  /** repaint the chrome tree (the shell renders it from `snapshot()`). */
  repaint: () => void;
}

export function createChromeController(deps: ChromeControllerDeps): ChromeController {
  const { surface, breakpointWidth, onBreakpointChange, repaint } = deps;
  let breakpoint: BreakpointId = "L4";
  let appearance: Appearance = "light";
  let dirty = false;
  let publishStatus: PublishStatus = "idle";
  let publishTimer: ReturnType<typeof setTimeout> | undefined;

  // The default width is set immediately so the page is at "Fit" before the first paint.
  document.documentElement.style.setProperty(
    "--nocms-page-width",
    breakpointWidth[breakpoint],
  );

  return {
    snapshot: () => ({ breakpoint, appearance, dirty, publishStatus }),
    setBreakpoint(bp) {
      breakpoint = bp;
      document.documentElement.style.setProperty(
        "--nocms-page-width",
        breakpointWidth[bp],
      );
      repaint();
      onBreakpointChange();
    },
    toggleAppearance() {
      appearance = appearance === "light" ? "dark" : "light";
      surface.dataset.appearance = appearance;
      repaint();
    },
    markDirty() {
      if (!dirty) {
        dirty = true;
        repaint();
      }
    },
    reset() {
      dirty = false;
      publishStatus = "idle";
      repaint();
    },
    changeset() {
      return dirty ? [{ kind: "edit", label: "Unpublished edits on this page" }] : [];
    },
    beginPublish() {
      publishStatus = "publishing";
      repaint();
      publishTimer = setTimeout(() => {
        publishStatus = "published";
        dirty = false;
        repaint();
      }, 1600);
    },
    isPublishing: () => publishStatus === "publishing",
    dispose() {
      if (publishTimer) clearTimeout(publishTimer);
    },
  };
}
