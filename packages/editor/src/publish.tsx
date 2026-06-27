// The publish popover: anchored under the Publish button, it states what publishing does
// (async, discrete — edits are already saved; publishing pushes them live in a background
// job) and summarizes the changes since the last publish before the one-click Publish now.
// Pure presenter; the shell owns the async job and the button's idle→publishing→published
// states (chrome.tsx).

import type { VNode } from "preact";

export interface Change {
  kind: "edit" | "add";
  label: string;
}

export interface PublishPopoverProps {
  changes: Change[];
  lastDeploy: string;
  onPublish: () => void;
  onClose: () => void;
}

export function PublishPopover({
  changes,
  lastDeploy,
  onPublish,
  onClose,
}: PublishPopoverProps): VNode {
  return (
    <div
      class="nc-nav-scrim"
      role="button"
      tabIndex={-1}
      aria-label="Close"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div class="nc-popover" role="dialog" aria-label="Publish">
        <div class="nc-pop-title">Publish to GitHub Pages</div>
        <p class="nc-pop-note">
          Edits are saved instantly. Publishing pushes them live in a background job.
        </p>

        {changes.length > 0 ? (
          <>
            <div class="nc-changeset-label nc-mono">Changes since last publish</div>
            {changes.map((c) => (
              <div key={c.label} class="nc-change">
                <span
                  class={`nc-change-dot ${c.kind === "add" ? "nc-olive" : "nc-amber"}`}
                />
                {c.label}
              </div>
            ))}
          </>
        ) : (
          <p class="nc-pop-note">No changes since the last publish.</p>
        )}

        <button
          type="button"
          class="nc-btn-primary"
          style="margin-top:14px"
          onClick={onPublish}
        >
          Publish now
        </button>

        <div class="nc-pop-foot">
          <span>Last deploy · {lastDeploy}</span>
          <span style="color:var(--nc-accent)">View live ↗</span>
        </div>
      </div>
    </div>
  );
}
