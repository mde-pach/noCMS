// Controls for the selected block, derived from its valibot props schema; editing one mutates the
// JSX node's attributes in place. One recursive, value-bound view renders them: a scalar binds to a
// single attribute; `group`/`list` bind to a structured attribute the editor round-trips as JSON
// (`items={[{…}]}`), so array/object content (feature cards, tiers, footer columns) is editable too.

import type { ControlDescriptor } from "@nocms/core";
import type { VNode } from "preact";
import { useState } from "preact/hooks";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ColumnIcon,
  GridIcon,
  GripIcon,
  PlusIcon,
  RowIcon,
  SectionIcon,
  TrashIcon,
} from "./icons.js";
import {
  getProp,
  getStructuredProp,
  type JsxElement,
  type PropValue,
  removeProp,
  setProp,
  setStructuredProp,
} from "./jsx-attributes.js";

/** A plain JS value a control edits, and the callback that writes it back up the tree.
 *  `undefined` clears the value (the attribute, or the object key). */
type CommitValue = (next: unknown) => void;

function MonoLabel({ children }: { children: string }): VNode {
  return <span class="nc-mono nc-label">{children}</span>;
}

function fileName(url: string): string {
  const clean = url.split("?")[0] ?? url;
  const last = clean.split("/").pop();
  return last && last.length > 0 ? last : url;
}

const asString = (value: unknown): string => (typeof value === "string" ? value : "");
const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

/** The starter value for a freshly added item, built from its control so a new row is valid
 *  (required text becomes an empty string to fill in; optionals stay absent). */
function defaultFor(control: ControlDescriptor): unknown {
  if (control.kind === "group") {
    const object: Record<string, unknown> = {};
    for (const child of control.children ?? []) {
      const value = defaultFor(child);
      if (value !== undefined) object[child.key] = value;
    }
    return object;
  }
  if (control.kind === "list") return (control.default as unknown[]) ?? [];
  if (control.default !== undefined) return control.default;
  if (control.kind === "boolean") return false;
  if (control.kind === "number" || control.kind === "range") return 0;
  return control.required ? "" : undefined;
}

const LABEL_KEYS = ["title", "name", "label", "heading"];

/** A short, human summary of a list item — its title-like field, else its first text field,
 *  else a numbered label. */
function itemSummary(
  item: unknown,
  itemControl: ControlDescriptor,
  index: number,
): string {
  if (typeof item === "string" && item.length > 0) return item;
  if (!item || typeof item !== "object") return `Item ${index + 1}`;
  const record = item as Record<string, unknown>;
  const textFields = (itemControl.children ?? []).filter(
    (f) => f.kind === "text" || f.kind === "richtext" || f.kind === "textarea",
  );
  const ordered = [
    ...textFields.filter((f) => LABEL_KEYS.includes(f.key.toLowerCase())),
    ...textFields.filter((f) => !LABEL_KEYS.includes(f.key.toLowerCase())),
  ];
  for (const field of ordered) {
    const value = record[field.key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return `Item ${index + 1}`;
}

interface ControlViewProps {
  control: ControlDescriptor;
  value: unknown;
  commit: CommitValue;
  /** present only for a top-level image attribute the host can open its media picker for. */
  onPickImage?: () => void;
}

/** Render one control from a plain value. Recurses for `group`/`list`. */
function ControlView({ control, value, commit, onPickImage }: ControlViewProps): VNode {
  const id = `nocms-field-${control.key}`;
  const { kind } = control;

  if (kind === "group")
    return <GroupView control={control} value={value} commit={commit} />;
  if (kind === "list")
    return <ListView control={control} value={value} commit={commit} />;

  if (kind === "boolean") {
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

  if (kind === "range") {
    const config = control.config ?? {};
    const min = typeof config.min === "number" ? config.min : 0;
    const max = typeof config.max === "number" ? config.max : 100;
    const current = asNumber(value) ?? Number(control.default ?? min);
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

  if (kind === "number") {
    return (
      <div class="nc-field">
        <MonoLabel>{control.label}</MonoLabel>
        <input
          id={id}
          name={control.key}
          class="nc-input"
          type="number"
          value={asNumber(value) !== undefined ? String(value) : ""}
          onInput={(e) => {
            const raw = e.currentTarget.value;
            commit(raw === "" ? undefined : Number(raw));
          }}
        />
      </div>
    );
  }

  if (kind === "layout-direction") {
    const options = (control.config?.options as string[] | undefined) ?? [];
    const current = asString(value) || (control.default as string) || options[0] || "";
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

  if (kind === "select") {
    const options = (control.config?.options as string[] | undefined) ?? [];
    const current = asString(value) || (control.default as string) || "";
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

  if (kind === "textarea" || kind === "richtext") {
    return (
      <div class="nc-field">
        <MonoLabel>{control.label}</MonoLabel>
        <textarea
          id={id}
          name={control.key}
          class="nc-textarea"
          value={asString(value)}
          onInput={(e) => {
            const raw = e.currentTarget.value;
            commit(raw === "" ? undefined : raw);
          }}
        />
      </div>
    );
  }

  if (kind === "color") {
    const current = asString(value);
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

  // An image attribute the host can browse for uses the media picker; a nested image (inside a
  // list/group, which the picker can't address) falls through to a plain URL field below.
  if (kind === "image" && onPickImage) {
    const current = asString(value);
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
            onClick={onPickImage}
          >
            Replace
          </button>
        </div>
      </div>
    );
  }

  // url/image-without-picker/date/text and any unknown plugin kind: a typed text input.
  const inputType = kind === "url" ? "url" : kind === "date" ? "date" : "text";
  return (
    <div class="nc-field">
      <MonoLabel>{control.label}</MonoLabel>
      <input
        id={id}
        name={control.key}
        class="nc-input"
        type={inputType}
        value={asString(value)}
        onInput={(e) => {
          const raw = e.currentTarget.value;
          commit(raw === "" ? undefined : raw);
        }}
      />
    </div>
  );
}

function GroupView({
  control,
  value,
  commit,
}: {
  control: ControlDescriptor;
  value: unknown;
  commit: CommitValue;
}): VNode {
  const object =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return (
    <div class="nc-group">
      <div class="nc-group-title">{control.label}</div>
      {(control.children ?? []).map((child) => (
        <ControlView
          key={child.key}
          control={child}
          value={object[child.key]}
          commit={(next) => commit({ ...object, [child.key]: next })}
        />
      ))}
    </div>
  );
}

function ListView({
  control,
  value,
  commit,
}: {
  control: ControlDescriptor;
  value: unknown;
  commit: CommitValue;
}): VNode {
  const [open, setOpen] = useState<number | null>(null);
  const items = Array.isArray(value) ? (value as unknown[]) : [];
  const itemControl = control.children?.[0];
  const fields = itemControl?.children ?? [];

  const writeItem = (index: number, next: unknown): void =>
    commit(items.map((item, i) => (i === index ? next : item)));
  const removeItem = (index: number): void => {
    commit(items.filter((_, i) => i !== index));
    setOpen(null);
  };
  const moveItem = (index: number, dir: -1 | 1): void => {
    const to = index + dir;
    if (to < 0 || to >= items.length) return;
    const next = items.slice();
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    commit(next);
    setOpen(to);
  };
  const addItem = (): void => {
    commit([...items, itemControl ? defaultFor(itemControl) : ""]);
    setOpen(items.length);
  };

  return (
    <div class="nc-field">
      <div class="nc-list-head">
        <MonoLabel>{control.label}</MonoLabel>
        <span class="nc-list-count">{items.length} ITEMS</span>
      </div>
      <div class="nc-list">
        {items.map((item, index) => {
          const expanded = open === index;
          return (
            <div key={index} class="nc-list-item">
              <div class="nc-list-row">
                <span class="nc-grip" aria-hidden="true">
                  <GripIcon />
                </span>
                <button
                  type="button"
                  class="nc-list-label nc-list-expand"
                  onClick={() => setOpen(expanded ? null : index)}
                >
                  {itemSummary(item, itemControl ?? control, index)}
                </button>
                <button
                  type="button"
                  class="nc-iconbtn nc-list-move"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  class="nc-iconbtn nc-list-move"
                  aria-label="Move down"
                  disabled={index === items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  type="button"
                  class="nc-iconbtn nc-list-remove"
                  aria-label="Remove item"
                  onClick={() => removeItem(index)}
                >
                  <TrashIcon size={13} />
                </button>
                <button
                  type="button"
                  class="nc-iconbtn nc-list-toggle"
                  aria-expanded={expanded}
                  aria-label="Edit item"
                  onClick={() => setOpen(expanded ? null : index)}
                >
                  {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              </div>
              {expanded ? (
                <div class="nc-list-item-body">
                  {fields.length > 0 && itemControl ? (
                    fields.map((field) => (
                      <ControlView
                        key={field.key}
                        control={field}
                        value={(item as Record<string, unknown>)?.[field.key]}
                        commit={(next) =>
                          writeItem(index, {
                            ...(item as Record<string, unknown>),
                            [field.key]: next,
                          })
                        }
                      />
                    ))
                  ) : itemControl ? (
                    <ControlView
                      control={{ ...itemControl, label: "Value" }}
                      value={item}
                      commit={(next) => writeItem(index, next)}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
        <button type="button" class="nc-list-add" onClick={addItem}>
          <PlusIcon size={12} /> Add item
        </button>
      </div>
    </div>
  );
}

// The 9-cell matrix sets the cross-axis (`align`, this control's key) and the main-axis (the
// sibling `justify` in config.mainKey) at once. Which physical axis is "main" follows the Frame's
// `direction`, so a dot maps to where it lands on the canvas.
function AlignMatrix({
  control,
  element,
  onChange,
}: {
  control: ControlDescriptor;
  element: JsxElement;
  onChange: () => void;
}): VNode {
  const POS = ["start", "center", "end"] as const;
  const mainKey =
    typeof control.config?.mainKey === "string" ? control.config.mainKey : "justify";
  const horizontalIsMain = getProp(element, "direction") === "row";
  const cross =
    asString(getProp(element, control.key)) || (control.default as string) || "start";
  const main = (getProp(element, mainKey) as string | undefined) ?? "start";
  const colValue = horizontalIsMain ? main : cross;
  const rowValue = horizontalIsMain ? cross : main;
  const setCell = (rowPos: string, colPos: string): void => {
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

/** Bind one top-level control to the selected element's attributes. Scalars write a single
 *  attribute; group/list write a JSON-valued attribute. */
function TopField({
  control,
  element,
  onChange,
  onPickImage,
}: {
  control: ControlDescriptor;
  element: JsxElement;
  onChange: () => void;
  onPickImage?: (key: string) => void;
}): VNode {
  if (control.kind === "layout-align") {
    return <AlignMatrix control={control} element={element} onChange={onChange} />;
  }
  if (control.kind === "group" || control.kind === "list") {
    const stored = getStructuredProp(element, control.key);
    const value = stored ?? control.default ?? (control.kind === "list" ? [] : {});
    return (
      <ControlView
        control={control}
        value={value}
        commit={(next) => {
          setStructuredProp(element, control.key, next);
          onChange();
        }}
      />
    );
  }
  return (
    <ControlView
      control={control}
      value={getProp(element, control.key)}
      commit={(next) => {
        if (next === undefined) removeProp(element, control.key);
        else setProp(element, control.key, next as PropValue);
        onChange();
      }}
      onPickImage={onPickImage ? () => onPickImage(control.key) : undefined}
    />
  );
}

function isVisible(control: ControlDescriptor, element: JsxElement): boolean {
  // `hidden` props are co-written by a sibling widget (the align matrix sets `justify`).
  if (control.kind === "hidden") return false;
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
  /** mono sub-label under the name, e.g. "SECTION · CORE" */
  meta?: string;
  /** controls derived from the block's valibot schema via `deriveControls` */
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
          <TopField
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
                  <TopField
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
