// The app chrome: the 56px top bar that frames the editor. Pure presenter — it raises
// intent (switch breakpoint, toggle appearance, reset, publish, open navigator) and the
// shell turns each into an action. The chrome accent is slate throughout: Publish is a
// chrome control, not site content, so it never wears the brand color (T0.1).

import type { VNode } from "preact";
import { CheckIcon, ChevronDown, MenuIcon, PublishIcon } from "./icons.js";

export type BreakpointId = "L0" | "L1" | "L2" | "L3" | "L4";
export type Appearance = "light" | "dark";
export type PublishStatus = "idle" | "publishing" | "published" | "error";

const BREAKPOINTS: BreakpointId[] = ["L0", "L1", "L2", "L3", "L4"];

export interface TopBarProps {
  siteHost: string;
  pageName: string;
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
        {BREAKPOINTS.map((bp) => (
          <button
            key={bp}
            type="button"
            class="nc-seg"
            style="flex:0 0 auto"
            aria-pressed={bp === breakpoint}
            onClick={() => onBreakpoint(bp)}
          >
            {bp}
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
