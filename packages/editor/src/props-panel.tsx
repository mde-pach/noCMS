import type { ControlDescriptor } from "@nocms/core";
import type { VNode } from "preact";
import { useState } from "preact/hooks";
import {
  ChevronDown,
  ChevronRight,
  ColumnIcon,
  GridIcon,
  GripIcon,
  PlusIcon,
  RowIcon,
  SectionIcon,
} from "./icons.js";
import {
  getProp,
  type JsxElement,
  type PropValue,
  removeProp,
  setProp,
} from "./jsx-attributes.js";

interface FieldProps {
  control: ControlDescriptor;
  element: JsxElement;
  onChange: () => void;
  onPickImage?: (key: string) => void;
}

function MonoLabel({ children }: { children: string }): VNode {
  return <span class="nc-mono nc-label">{children}</span>;
}

function fileName(url: string): string {
  const clean = url.split("?")[0] ?? url;
  const last = clean.split("/").pop();
  return last && last.length > 0 ? last : url;
}

function Field({ control, element, onChange, onPickImage }: FieldProps): VNode {
  const id = `nocms-field-${control.key}`;
  const value = getProp(element, control.key);
  const commit = (next: PropValue | undefined) => {
    if (next === undefined) removeProp(element, control.key);
    else setProp(element, control.key, next);
    onChange();
  };

  if (control.kind === "boolean") {
    const on = value === true;
    return (
      <div class="nc-field nc-row">
        <label class="nc-row-label" for={id}>
          {control.label}
        </label>
        <button
          type="button"
          id={id}
          name={control.key}
          class="nc-toggle"
          aria-pressed={on}
          onClick={() => commit(!on)}
        />
      </div>
    );
  }

  if (control.kind === "range") {
    const config = control.config ?? {};
    const min = typeof config.min === "number" ? config.min : 0;
    const max = typeof config.max === "number" ? config.max : 100;
    const current = typeof value === "number" ? value : Number(control.default ?? min);
    const unit = typeof config.unit === "string" ? config.unit : "";
    return (
      <div class="nc-field">
        <div class="nc-slider-head">
          <MonoLabel>{control.label}</MonoLabel>
          <span class="nc-slider-val">
            {current}
            {unit}
          </span>
        </div>
        <input
          id={id}
          name={control.key}
          class="nc-slider"
          type="range"
          min={min}
          max={max}
          value={String(current)}
          onInput={(e) => commit(Number(e.currentTarget.value))}
        />
      </div>
    );
  }

  if (control.kind === "number") {
    return (
      <div class="nc-field">
        <MonoLabel>{control.label}</MonoLabel>
        <input
          id={id}
          name={control.key}
          class="nc-input"
          type="number"
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
    const current =
      typeof value === "string" ? value : ((control.default as string) ?? "");
    if (options.length > 0 && options.length <= 3) {
      return (
        <div class="nc-field">
          <MonoLabel>{control.label}</MonoLabel>
          <div class="nc-segmented" role="group" aria-label={control.label}>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                name={control.key}
                value={opt}
                class="nc-seg"
                aria-pressed={current === opt}
                onClick={() => commit(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div class="nc-field">
        <MonoLabel>{control.label}</MonoLabel>
        <select
          id={id}
          name={control.key}
          class="nc-input"
          value={current}
          onChange={(e) => commit(e.currentTarget.value)}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (control.kind === "layout-direction") {
    const options = (control.config?.options as string[] | undefined) ?? [];
    const current =
      typeof value === "string"
        ? value
        : ((control.default as string) ?? options[0] ?? "");
    const icon: Record<string, VNode> = {
      row: <RowIcon />,
      column: <ColumnIcon />,
      grid: <GridIcon />,
    };
    return (
      <div class="nc-field">
        <MonoLabel>{control.label}</MonoLabel>
        <div class="nc-segmented" role="group" aria-label={control.label}>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              name={control.key}
              value={opt}
              class="nc-seg nc-seg-icon"
              aria-pressed={current === opt}
              onClick={() => commit(opt)}
            >
              {icon[opt] ?? null}
              <span>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // A 2-axis alignment matrix (Figma's picker): the 9 cells set the cross-axis (`align`,
  // this control's key) and the main-axis (the sibling `justify` named in config.mainKey)
  // at once. Which physical axis is "main" follows the Frame's `direction`, so the dots
  // map to the same place they render on the canvas.
  if (control.kind === "layout-align") {
    const POS = ["start", "center", "end"] as const;
    const mainKey =
      typeof control.config?.mainKey === "string" ? control.config.mainKey : "justify";
    const direction = (getProp(element, "direction") as string | undefined) ?? "column";
    const horizontalIsMain = direction === "row";
    const cross =
      typeof value === "string" ? value : ((control.default as string) ?? "start");
    const main = (getProp(element, mainKey) as string | undefined) ?? "start";
    const colValue = horizontalIsMain ? main : cross;
    const rowValue = horizontalIsMain ? cross : main;
    const setCell = (rowPos: string, colPos: string) => {
      setProp(element, control.key, horizontalIsMain ? rowPos : colPos);
      setProp(element, mainKey, horizontalIsMain ? colPos : rowPos);
      onChange();
    };
    return (
      <div class="nc-field">
        <MonoLabel>{control.label}</MonoLabel>
        <div class="nc-align-matrix" role="group" aria-label={control.label}>
          {POS.flatMap((rowPos) =>
            POS.map((colPos) => (
              <button
                key={`${rowPos}-${colPos}`}
                type="button"
                class="nc-align-cell"
                aria-pressed={colValue === colPos && rowValue === rowPos}
                aria-label={`${rowPos} ${colPos}`}
                onClick={() => setCell(rowPos, colPos)}
              >
                <span class="nc-align-dot" />
              </button>
            )),
          )}
        </div>
      </div>
    );
  }

  if (control.kind === "textarea" || control.kind === "richtext") {
    return (
      <div class="nc-field">
        <MonoLabel>{control.label}</MonoLabel>
        <textarea
          id={id}
          name={control.key}
          class="nc-textarea"
          value={typeof value === "string" ? value : ""}
          onInput={(e) => {
            const raw = e.currentTarget.value;
            commit(raw === "" ? undefined : raw);
          }}
        />
      </div>
    );
  }

  if (control.kind === "color") {
    const current = typeof value === "string" ? value : "";
    return (
      <div class="nc-field">
        <MonoLabel>{control.label}</MonoLabel>
        <div class="nc-color-field">
          <input
            type="color"
            class="nc-color-swatch"
            aria-label={`${control.label} swatch`}
            value={current || "#000000"}
            onInput={(e) => commit(e.currentTarget.value)}
          />
          <input
            id={id}
            name={control.key}
            class="nc-input"
            type="text"
            value={current}
            onInput={(e) => {
              const raw = e.currentTarget.value;
              commit(raw === "" ? undefined : raw);
            }}
          />
        </div>
      </div>
    );
  }

  if (control.kind === "image") {
    const current = typeof value === "string" ? value : "";
    return (
      <div class="nc-field">
        <MonoLabel>{control.label}</MonoLabel>
        <div class="nc-image-control">
          <div
            class="nc-image-thumb"
            style={current ? `background-image:url(${current})` : undefined}
          />
          <div class="nc-image-meta">
            <div class="nc-image-name">{current ? fileName(current) : "No image"}</div>
            <div class="nc-image-dim">{current ? "image" : "—"}</div>
          </div>
          <button
            type="button"
            name={control.key}
            class="nc-link"
            style="font-weight:600"
            onClick={() => onPickImage?.(control.key)}
          >
            Replace
          </button>
        </div>
      </div>
    );
  }

  if (control.kind === "group") {
    return (
      <div class="nc-group">
        <div class="nc-group-title">{control.label}</div>
        {(control.children ?? []).map((child) => (
          <Field
            key={child.key}
            control={child}
            element={element}
            onChange={onChange}
            onPickImage={onPickImage}
          />
        ))}
      </div>
    );
  }

  if (control.kind === "list") {
    const item = control.children?.[0];
    return (
      <div class="nc-field">
        <div class="nc-list-head">
          <MonoLabel>{control.label}</MonoLabel>
          <span class="nc-list-count">LIST</span>
        </div>
        <div class="nc-list">
          <div class="nc-list-row">
            <span class="nc-grip" aria-hidden="true">
              <GripIcon />
            </span>
            <span class="nc-list-label">{item?.label ?? "Item"}</span>
            <span class="nc-list-badge">EDIT ON CANVAS</span>
            <ChevronRight size={12} />
          </div>
          <button type="button" class="nc-list-add">
            <PlusIcon size={12} /> Add item
          </button>
        </div>
      </div>
    );
  }

  // url/date/reference and any unknown plugin kind fall back to a typed text input.
  const inputType =
    control.kind === "url" ? "url" : control.kind === "date" ? "date" : "text";
  return (
    <div class="nc-field">
      <MonoLabel>{control.label}</MonoLabel>
      <input
        id={id}
        name={control.key}
        class="nc-input"
        type={inputType}
        value={typeof value === "string" ? value : ""}
        onInput={(e) => {
          const raw = e.currentTarget.value;
          commit(raw === "" ? undefined : raw);
        }}
      />
    </div>
  );
}

// Nested object/array props aren't attribute-shaped, so they can't round-trip through the scalar
// attribute model; their children are edited on the canvas, not in the panel's fields.
const STRUCTURAL_KINDS: ReadonlySet<string> = new Set(["group", "list"]);

function isVisible(control: ControlDescriptor, element: JsxElement): boolean {
  if (STRUCTURAL_KINDS.has(control.kind)) return false;
  // A `hidden` prop is co-written by a sibling widget (the `layout-align` matrix sets
  // `justify`), so it never gets its own field.
  if (control.kind === "hidden") return false;
  if (control.showIf) {
    return getProp(element, control.showIf.key) === control.showIf.equals;
  }
  return true;
}

export interface PropsPanelProps {
  element: JsxElement;
  /** the block's name, shown as the panel title */
  component: string;
  /** mono sub-label under the name, e.g. "SECTION · CORE" */
  meta?: string;
  controls: ControlDescriptor[];
  /** fired after every edit; the shell re-serializes the doc and re-renders the canvas */
  onChange: () => void;
  /** open the media picker for an image control */
  onPickImage?: (key: string) => void;
}

export function PropsPanel({
  element,
  component,
  meta = "SECTION",
  controls,
  onChange,
  onPickImage,
}: PropsPanelProps): VNode {
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Controls that show their value through derived markup (segmented `aria-pressed`,
  // the toggle, the color swatch, the image preview) only reflect an edit when the panel
  // re-renders. An edit mutates the node in place, so a local re-render re-reads the fresh
  // props; the focused field's DOM is reused, so typing in a text field isn't disturbed.
  const [, bump] = useState(0);
  const handleChange = (): void => {
    onChange();
    bump((n) => n + 1);
  };
  const visible = controls.filter((c) => isVisible(c, element));
  const primary = visible.filter((c) => !c.advanced);
  const advanced = visible.filter((c) => c.advanced);

  return (
    <div class="nocms-props">
      <div class="nc-block-head">
        <div class="nc-block-icon">
          <SectionIcon />
        </div>
        <div style="flex:1">
          <div class="nocms-props-title nc-block-name">{component}</div>
          <div class="nc-block-meta">{meta}</div>
        </div>
      </div>
      <div class="nc-rail-pad">
        {primary.map((control) => (
          <Field
            key={control.key}
            control={control}
            element={element}
            onChange={handleChange}
            onPickImage={onPickImage}
          />
        ))}
        {advanced.length > 0 ? (
          <>
            <button
              type="button"
              class="nc-disclosure"
              aria-expanded={showAdvanced}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              <span>Advanced</span>
              {showAdvanced ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            {showAdvanced
              ? advanced.map((control) => (
                  <Field
                    key={control.key}
                    control={control}
                    element={element}
                    onChange={handleChange}
                    onPickImage={onPickImage}
                  />
                ))
              : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
