// The properties panel: friendly controls for the selected block, derived live from
// its valibot props schema by @nocms/core's deriveControls (D9). Editing a control
// mutates the JSX node's attributes in place and calls onChange so the shell can
// re-serialize and re-render the canvas — the owner never sees JSX or attribute syntax.

import type { ControlDescriptor } from "@nocms/core";
import type { VNode } from "preact";
import {
  getProp,
  type JsxElement,
  type PropValue,
  removeProp,
  setProp,
} from "./jsx-attributes.js";

// Structural kinds aren't attribute-shaped, so they aren't panel fields: children
// are edited on the canvas (slots, D15); nested group/list controls land later.
const STRUCTURAL_KINDS: ReadonlySet<string> = new Set(["group", "list"]);

interface FieldProps {
  control: ControlDescriptor;
  element: JsxElement;
  onChange: () => void;
}

function Field({ control, element, onChange }: FieldProps): VNode {
  const id = `nocms-field-${control.key}`;
  const value = getProp(element, control.key);
  const commit = (next: PropValue | undefined) => {
    if (next === undefined) removeProp(element, control.key);
    else setProp(element, control.key, next);
    onChange();
  };

  if (control.kind === "boolean") {
    return (
      <div class="nocms-field">
        <label for={id}>{control.label}</label>
        <input
          id={id}
          name={control.key}
          type="checkbox"
          checked={value === true}
          onChange={(e) => commit(e.currentTarget.checked)}
        />
      </div>
    );
  }

  if (control.kind === "number" || control.kind === "range") {
    const config = control.config ?? {};
    return (
      <div class="nocms-field">
        <label for={id}>{control.label}</label>
        <input
          id={id}
          name={control.key}
          type={control.kind === "range" ? "range" : "number"}
          min={typeof config.min === "number" ? config.min : undefined}
          max={typeof config.max === "number" ? config.max : undefined}
          value={typeof value === "number" ? String(value) : ""}
          onInput={(e) => {
            const raw = e.currentTarget.value;
            commit(raw === "" ? undefined : Number(raw));
          }}
        />
      </div>
    );
  }

  if (control.kind === "select") {
    const options = (control.config?.options as string[] | undefined) ?? [];
    return (
      <div class="nocms-field">
        <label for={id}>{control.label}</label>
        <select
          id={id}
          name={control.key}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => commit(e.currentTarget.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Everything text-shaped (text, url, image, color, richtext, reference, date) and
  // any unknown/plugin kind falls back to a text input — the richer controls (media
  // picker, color swatch, rich text) arrive with their phases without touching blocks.
  return (
    <div class="nocms-field">
      <label for={id}>{control.label}</label>
      <input
        id={id}
        name={control.key}
        type="text"
        value={typeof value === "string" ? value : ""}
        onInput={(e) => {
          const raw = e.currentTarget.value;
          commit(raw === "" ? undefined : raw);
        }}
      />
    </div>
  );
}

function isVisible(control: ControlDescriptor, element: JsxElement): boolean {
  if (STRUCTURAL_KINDS.has(control.kind)) return false;
  if (control.showIf) {
    return getProp(element, control.showIf.key) === control.showIf.equals;
  }
  return true;
}

export interface PropsPanelProps {
  /** the selected block node in the document */
  element: JsxElement;
  /** the block's name, shown as the panel title */
  component: string;
  /** controls derived from the block's valibot schema via `deriveControls` */
  controls: ControlDescriptor[];
  /** fired after every edit; the shell re-serializes the doc and re-renders the canvas */
  onChange: () => void;
}

export function PropsPanel({
  element,
  component,
  controls,
  onChange,
}: PropsPanelProps): VNode {
  const fields = controls.filter((c) => isVisible(c, element));
  return (
    <div class="nocms-props">
      <h2 class="nocms-props-title">{component}</h2>
      {fields.map((control) => (
        <Field
          key={control.key}
          control={control}
          element={element}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
