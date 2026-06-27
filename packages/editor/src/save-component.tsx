// "Save as component": promote the selected block into a reusable saved component (D20).
// Opt-out demotion — every control starts exposed (editable on instances); the author locks
// the ones that should be baked in. The dialog only collects intent (a name + which controls
// stay editable); the shell turns that into a `SavedComponentDef`, registers it, and converts
// the selection into an instance.

import type { ControlDescriptor } from "@nocms/core";
import type { VNode } from "preact";
import { useMemo, useState } from "preact/hooks";
import { CloseIcon } from "./icons.js";

export interface SaveComponentDialogProps {
  /** the block being saved, e.g. "Button" — shown as the component's starting point. */
  base: string;
  /** the base's controls; each becomes an exposed-or-locked row (default exposed). */
  controls: ControlDescriptor[];
  /** confirm with the chosen name and the keys that stay editable on instances. */
  onSave: (name: string, exposed: string[]) => void;
  onClose: () => void;
}

const NAME_RE = /^[A-Za-z][A-Za-z0-9]*$/;

export function SaveComponentDialog({
  base,
  controls,
  onSave,
  onClose,
}: SaveComponentDialogProps): VNode {
  const [name, setName] = useState("");
  const [exposed, setExposed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(controls.map((c) => [c.key, true])),
  );

  const exposedKeys = useMemo(
    () => controls.filter((c) => exposed[c.key]).map((c) => c.key),
    [controls, exposed],
  );
  // A PascalCase tag name keeps it a valid JSX element distinct from prose.
  const valid = NAME_RE.test(name.trim());

  const toggle = (key: string): void =>
    setExposed((prev) => ({ ...prev, [key]: !prev[key] }));

  const submit = (): void => {
    if (valid) onSave(name.trim(), exposedKeys);
  };

  return (
    <div
      class="nc-scrim"
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
      <div
        class="nc-sheet nocms-save-dialog"
        role="dialog"
        aria-label="Save as component"
        style="max-width:440px"
      >
        <div class="nc-sheet-head">
          <div class="nc-sheet-titlerow">
            <div>
              <div class="nc-sheet-title">Save as component</div>
              <div class="nc-sheet-sub">
                A reusable component from this {base}. Locked controls are baked in.
              </div>
            </div>
            <button
              type="button"
              class="nc-iconbtn"
              aria-label="Close"
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>

          <div class="nc-sheet-search">
            <input
              type="text"
              name="component-name"
              placeholder="Component name, e.g. PrimaryCTA"
              value={name}
              onInput={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
        </div>

        <div class="nc-sheet-body">
          {controls.length === 0 ? (
            <p class="nocms-empty">This block has no controls to expose.</p>
          ) : (
            <div class="nocms-expose-list">
              {controls.map((c) => (
                <div key={c.key} class="nocms-expose-row">
                  <span class="nocms-expose-label">{c.label}</span>
                  <button
                    type="button"
                    class="nocms-expose-toggle"
                    data-key={c.key}
                    aria-pressed={exposed[c.key] ? "true" : "false"}
                    onClick={() => toggle(c.key)}
                  >
                    {exposed[c.key] ? "Editable" : "Locked"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div class="nc-sheet-foot">
          <button type="button" class="nc-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            class="nc-btn-primary nocms-save-confirm"
            style="width:auto;padding:9px 18px"
            disabled={!valid}
            onClick={submit}
          >
            Save component
          </button>
        </div>
      </div>
    </div>
  );
}
