import type { VNode } from "preact";
import { CheckIcon, ChevronDown, MenuIcon, PublishIcon } from "./icons.js";

// A breakpoint is one viewport the canvas can render at: an opaque id (the site's, e.g. a Tailwind
// key), a label for the top bar, and the page width it sizes the canvas to. The editor stays
// styling-agnostic — it never interprets the id, only sizes by `width` and reports the active id to
// the site's Style panel, which maps it to its own variant grammar.
export interface Breakpoint {
  id: string;
  label: string;
  width: string;
}
export type BreakpointId = string;
export type Appearance = "light" | "dark";
export type PublishStatus = "idle" | "publishing" | "published" | "error";

export const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  { id: "L0", label: "L0", width: "390px" },
  { id: "L1", label: "L1", width: "600px" },
  { id: "L2", label: "L2", width: "834px" },
  { id: "L3", label: "L3", width: "1280px" },
  { id: "L4", label: "Fit", width: "100%" },
];

export interface TopBarProps {
  siteHost: string;
  pageName: string;
  breakpoints: Breakpoint[];
  breakpoint: BreakpointId;
  onBreakpoint: (bp: BreakpointId) => void;
  appearance: Appearance;
  onAppearance: () => void;
  dirty: boolean;
  onReset: () => void;
  publishStatus: PublishStatus;
  onPublish: () => void;
  onMenu: () => void;
  onPagePill: () => void;
  avatarInitial: string;
}

function PublishButton({
  status,
  onPublish,
}: {
  status: PublishStatus;
  onPublish: () => void;
}): VNode {
  if (status === "publishing") {
    return (
      <button type="button" class="nc-publish nc-publish-busy" disabled>
        <span class="nc-spin" />
        Publishing…
      </button>
    );
  }
  if (status === "published") {
    return (
      <button type="button" class="nc-publish nc-publish-done" onClick={onPublish}>
        <CheckIcon size={13} />
        Published · <span class="nc-viewlive">view live</span>
      </button>
    );
  }
  if (status === "error") {
    return (
      <button type="button" class="nc-publish nc-publish-error" onClick={onPublish}>
        Failed — retry
      </button>
    );
  }
  return (
    <button type="button" class="nc-publish nc-publish-idle" onClick={onPublish}>
      <PublishIcon size={14} />
      Publish
    </button>
  );
}

export function TopBar({
  siteHost,
  pageName,
  breakpoints,
  breakpoint,
  onBreakpoint,
  appearance,
  onAppearance,
  dirty,
  onReset,
  publishStatus,
  onPublish,
  onMenu,
  onPagePill,
  avatarInitial,
}: TopBarProps): VNode {
  return (
    <div class="nocms-topbar">
      <button
        type="button"
        class="nc-iconbtn"
        title="Pages & structure"
        onClick={onMenu}
      >
        <MenuIcon />
      </button>

      <div class="nc-identity">
        <span class="nc-live-dot" />
        <span class="nc-host">{siteHost}</span>
        <span class="nc-sep">/</span>
        <button type="button" class="nc-page-pill" onClick={onPagePill}>
          {pageName}
          <ChevronDown size={11} />
        </button>
      </div>

      <div class="nc-spacer" />

      <div class="nc-segmented" role="group" aria-label="Breakpoint">
        {breakpoints.map((bp) => (
          <button
            key={bp.id}
            type="button"
            class="nc-seg"
            style="flex:0 0 auto"
            aria-pressed={bp.id === breakpoint}
            onClick={() => onBreakpoint(bp.id)}
          >
            {bp.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        class="nc-appearance"
        title={appearance === "light" ? "Light" : "Dark"}
        onClick={onAppearance}
      >
        <i class="nc-half-light" />
        <i class="nc-half-dark" />
      </button>

      <div class="nc-vsep" />

      {dirty ? (
        <div class="nc-save">
          <span class="nc-save-dot" />
          <span class="nc-save-text">Unsaved edits</span>
          <button type="button" class="nc-link" onClick={onReset}>
            Reset
          </button>
        </div>
      ) : null}

      <PublishButton status={publishStatus} onPublish={onPublish} />

      <button type="button" class="nc-avatar" title="Account">
        {avatarInitial}
      </button>
    </div>
  );
}
