import type { ControlDescriptor } from "@nocms/controls";
import type { VNode } from "preact";
import { useMemo, useState } from "preact/hooks";
import { CloseIcon } from "./icons.js";

export interface SaveComponentDialogProps {
  /** the block being saved, e.g. "Button" — the component's starting point. */
  base: string;
  /** the base's settings; each becomes an editable-or-locked row (default editable). */
  controls: ControlDescriptor[];
  /** the current value of each setting, shown so "locked" reads concretely. */
  values?: Record<string, string | number | boolean>;
  /** rendered HTML of the selected block, shown as a live preview. */
  previewHtml?: string;
  /** true when the block has contents — offers keeping them as an editable area (compose). */
  container?: boolean;
  /** confirm with the chosen name, the keys that stay editable, and whether to keep the
   *  block's contents as an editable area. */
  onSave: (name: string, exposed: string[], slot: boolean) => void;
  onClose: () => void;
}

const NAME_RE = /^[A-Za-z][A-Za-z0-9]*$/;

function showValue(value: string | number | boolean | undefined): string {
  if (value === undefined) return "—";
  if (typeof value === "string") return value.length ? `“${value}”` : "empty";
  return String(value);
}

export function SaveComponentDialog({
  base,
  controls,
  values = {},
  previewHtml,
  container = false,
  onSave,
  onClose,
}: SaveComponentDialogProps): VNode {
  const [name, setName] = useState("");
  const [exposed, setExposed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(controls.map((c) => [c.key, true])),
  );
  const [keepSlot, setKeepSlot] = useState(true);

  const exposedKeys = useMemo(
    () => controls.filter((c) => exposed[c.key]).map((c) => c.key),
    [controls, exposed],
  );
  // A PascalCase tag name keeps it a valid JSX element distinct from prose.
  const valid = NAME_RE.test(name.trim());

  const toggle = (key: string): void =>
    setExposed((prev) => ({ ...prev, [key]: !prev[key] }));

  const submit = (): void => {
    if (valid) onSave(name.trim(), exposedKeys, container && keepSlot);
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
        style="max-width:480px"
      >
        <div class="nc-sheet-head">
          <div class="nc-sheet-titlerow">
            <div>
              <div class="nc-sheet-title">Save as component</div>
              <div class="nc-sheet-sub">
                Turn this {base} into a reusable component. Choose what people can
                change each time — everything else stays exactly as it looks now.
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

          {previewHtml ? (
            <div class="nocms-save-preview">
              <span class="nc-mono-label nocms-save-preview-tag">Preview</span>
              <div
                class="nocms-save-preview-inner"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: a clone of the block already rendered (and sanitized) on the canvas.
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          ) : null}

          <label class="nocms-field">
            <span class="nc-mono-label">Name</span>
            <input
              type="text"
              name="component-name"
              placeholder="e.g. PrimaryCTA"
              value={name}
              onInput={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </label>
        </div>

        <div class="nc-sheet-body">
          <div class="nc-mono-label nocms-expose-head">What can people change?</div>
          {controls.length === 0 && !container ? (
            <p class="nocms-empty">This block has no settings to expose.</p>
          ) : (
            <div class="nocms-expose-list">
              {controls.map((c) => (
                <div key={c.key} class="nocms-expose-row">
                  <span class="nocms-expose-label">{c.label}</span>
                  <span class="nocms-expose-value">{showValue(values[c.key])}</span>
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
              {container ? (
                <div class="nocms-expose-row nocms-slot-row">
                  <span class="nocms-expose-label">Contents</span>
                  <span class="nocms-expose-value">what's inside</span>
                  <button
                    type="button"
                    class="nocms-expose-toggle nocms-slot-toggle"
                    aria-pressed={keepSlot ? "true" : "false"}
                    onClick={() => setKeepSlot((v) => !v)}
                  >
                    {keepSlot ? "Editable" : "Locked"}
                  </button>
                </div>
              ) : null}
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
