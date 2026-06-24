// The properties panel: friendly controls for the selected component, derived from its
// discovered prop types (@nocms/props-discovery). Editing a control mutates the JSX
// node's attributes in place and calls onChange so the shell can re-serialize and
// re-render the canvas — the owner never sees JSX or attribute syntax.

import type { ComponentSchema, Control } from "@nocms/props-discovery";
import type { VNode } from "preact";
import {
  getProp,
  type JsxElement,
  type PropValue,
  removeProp,
  setProp,
} from "./jsx-attributes.js";

// "ctaLabel" → "Cta label". A readable field label without a separate annotation.
function humanize(prop: string): string {
  const spaced = prop.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Children and event handlers aren't attribute-shaped, so they aren't panel fields:
// the slot is edited on the canvas, actions are bound elsewhere.
const ATTRIBUTE_KINDS: ReadonlySet<Control["kind"]> = new Set([
  "text",
  "number",
  "boolean",
  "select",
  "media",
]);

interface FieldProps {
  control: Control;
  element: JsxElement;
  onChange: () => void;
}

function Field({ control, element, onChange }: FieldProps): VNode {
  const id = `nocms-field-${control.prop}`;
  const value = getProp(element, control.prop);
  const commit = (next: PropValue | undefined) => {
    if (next === undefined) removeProp(element, control.prop);
    else setProp(element, control.prop, next);
    onChange();
  };

  if (control.kind === "boolean") {
    return (
      <div class="nocms-field">
        <label for={id}>{humanize(control.prop)}</label>
        <input
          id={id}
          name={control.prop}
          type="checkbox"
          checked={value === true}
          onChange={(e) => commit(e.currentTarget.checked)}
        />
        {control.help ? <p class="nocms-help">{control.help}</p> : null}
      </div>
    );
  }

  if (control.kind === "number") {
    return (
      <div class="nocms-field">
        <label for={id}>{humanize(control.prop)}</label>
        <input
          id={id}
          name={control.prop}
          type="number"
          value={typeof value === "number" ? String(value) : ""}
          onInput={(e) => {
            const raw = e.currentTarget.value;
            commit(raw === "" ? undefined : Number(raw));
          }}
        />
        {control.help ? <p class="nocms-help">{control.help}</p> : null}
      </div>
    );
  }

  if (control.kind === "select") {
    return (
      <div class="nocms-field">
        <label for={id}>{humanize(control.prop)}</label>
        <select
          id={id}
          name={control.prop}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => commit(e.currentTarget.value)}
        >
          {(control.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {control.help ? <p class="nocms-help">{control.help}</p> : null}
      </div>
    );
  }

  // text and media: a plain text field. Clearing an optional value drops the attribute.
  return (
    <div class="nocms-field">
      <label for={id}>{humanize(control.prop)}</label>
      <input
        id={id}
        name={control.prop}
        type="text"
        value={typeof value === "string" ? value : ""}
        onInput={(e) => {
          const raw = e.currentTarget.value;
          commit(raw === "" ? undefined : raw);
        }}
      />
      {control.help ? <p class="nocms-help">{control.help}</p> : null}
    </div>
  );
}

export interface PropsPanelProps {
  /** the selected component node in the document */
  element: JsxElement;
  /** controls discovered from the component's prop types */
  schema: ComponentSchema;
  /** fired after every edit; the shell re-serializes the doc and re-renders the canvas */
  onChange: () => void;
}

export function PropsPanel({ element, schema, onChange }: PropsPanelProps): VNode {
  const fields = schema.controls.filter((c) => ATTRIBUTE_KINDS.has(c.kind));
  return (
    <div class="nocms-props">
      <h2 class="nocms-props-title">{schema.component}</h2>
      {fields.map((control) => (
        <Field
          key={control.prop}
          control={control}
          element={element}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
