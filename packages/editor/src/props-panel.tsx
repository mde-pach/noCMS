// Controls for the selected block, derived from its valibot props schema; editing one mutates the
// JSX node's attributes in place. One recursive, value-bound view renders them: a scalar binds to a
// single attribute; `group`/`list` bind to a structured attribute the editor round-trips as JSON
// (`items={[{…}]}`), so array/object content (feature cards, tiers, footer columns) is editable too.
//
// The panel and the page are two faces of one selection: a click on the canvas focuses + centres the
// matching control here (`focus`), and focusing a control here lights up its leaf on the page
// (`onActivate`). Centring only ever scrolls the panel's own scroller — never the canvas — so syncing
// a selection can't shift the page under the user mid-edit.

import type { ControlDescriptor } from "@nocms/controls";
import type { VNode } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
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

/** A content click: which leaf to focus, and a per-click nonce so re-clicking the *same* leaf
 *  re-fires focus (its path alone is unchanged). */
export interface ContentFocus {
  path: string;
  nonce: number;
}

/** The nearest scrollable ancestor of `el` — the panel's own scroll container. */
function scrollableAncestor(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/** Scroll `el` to the vertical centre of the panel's scroll container, and nothing else. The canvas
 *  is not an ancestor of the panel, so the page never moves — syncing a selection from the page
 *  centres the matching control without shifting the page the user is editing. */
function centerInPanel(el: HTMLElement): void {
  const scroller = scrollableAncestor(el);
  if (!scroller) return;
  const e = el.getBoundingClientRect();
  const s = scroller.getBoundingClientRect();
  const top =
    scroller.scrollTop + (e.top - s.top) - (scroller.clientHeight - e.height) / 2;
  scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

/** Centre this control in the panel when it becomes the focus target. Keyed on `nonce` so a fresh
 *  click re-centres even the already-active control, while typing (same nonce) never re-scrolls. */
function useCenterOnMatch<T extends HTMLElement>(
  active: boolean,
  nonce: number | undefined,
) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (active && ref.current) centerInPanel(ref.current);
  }, [active, nonce]);
  return ref;
}

/** Focus (and select) a leaf input when it is the focus target. Keyed on `nonce`, not a boolean:
 *  typing/sibling edits re-render without changing the nonce, so focus is never stolen back, yet
 *  every fresh click — even on the already-focused leaf — refocuses. Centring is handled separately
 *  on the field wrapper, so this never scrolls. */
function useFocusOnMatch(active: boolean, nonce: number | undefined) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (!active || !ref.current) return;
    ref.current.focus();
    ref.current.select?.();
  }, [active, nonce]);
  return ref;
}

/** A textarea that grows to fit its value (so a long string shows in full, no inner scroll) and
 *  focuses when it is the active leaf. */
function useTextarea(active: boolean, nonce: number | undefined, value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useLayoutEffect(() => {
    if (active && ref.current) {
      ref.current.focus();
      ref.current.select?.();
    }
  }, [active, nonce]);
  return ref;
}

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

/** A row of `.nc-segmented` buttons — the inline picker for a small option set (a layout direction,
 *  a ≤3-option select). `renderOption` supplies an icon-led label; its absence is a plain text seg. */
function SegmentedControl({
  label,
  name,
  options,
  current,
  commit,
  renderOption,
  path,
  active,
  wrapRef,
}: {
  label: string;
  name: string;
  options: string[];
  current: string;
  commit: CommitValue;
  renderOption?: (opt: string) => VNode;
  path?: string;
  active?: boolean;
  wrapRef?: ReturnType<typeof useCenterOnMatch<HTMLDivElement>>;
}): VNode {
  return (
    <div
      class={active ? "nc-field is-active" : "nc-field"}
      data-nocms-control={path}
      ref={wrapRef}
    >
      <MonoLabel>{label}</MonoLabel>
      <div class="nc-segmented" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            name={name}
            value={opt}
            class={renderOption ? "nc-seg nc-seg-icon" : "nc-seg"}
            aria-pressed={current === opt}
            onClick={() => commit(opt)}
          >
            {renderOption ? renderOption(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ControlViewProps {
  control: ControlDescriptor;
  value: unknown;
  commit: CommitValue;
  /** absolute dotted path of this control's value within the block's props, e.g. `items.2.title` */
  path: string;
  /** the content leaf to focus (matched against `path` at the leaves), with its per-click nonce */
  focus?: ContentFocus;
  /** present only for a top-level image attribute the host can open its media picker for. */
  onPickImage?: () => void;
}

/** Render one control from a plain value. Recurses for `group`/`list`. The active control (its
 *  `path` is the focus target) carries `is-active` and is centred in the panel. */
function ControlView({
  control,
  value,
  commit,
  path,
  focus,
  onPickImage,
}: ControlViewProps): VNode {
  const id = `nocms-field-${control.key}`;
  const { kind } = control;
  const active = path === focus?.path;
  const wrapRef = useCenterOnMatch<HTMLDivElement>(active, focus?.nonce);
  const inputRef = useFocusOnMatch(active, focus?.nonce);
  const textareaRef = useTextarea(active, focus?.nonce, asString(value));
  const fieldClass = active ? "nc-field is-active" : "nc-field";

  if (kind === "group")
    return (
      <GroupView
        control={control}
        value={value}
        commit={commit}
        path={path}
        focus={focus}
      />
    );
  if (kind === "list")
    return (
      <ListView
        control={control}
        value={value}
        commit={commit}
        path={path}
        focus={focus}
      />
    );

  if (kind === "boolean") {
    const on = value === true;
    return (
      <div
        class={active ? "nc-field nc-row is-active" : "nc-field nc-row"}
        data-nocms-control={path}
        ref={wrapRef}
      >
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
      <div class={fieldClass} data-nocms-control={path} ref={wrapRef}>
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
      <div class={fieldClass} data-nocms-control={path} ref={wrapRef}>
        <MonoLabel>{control.label}</MonoLabel>
        <input
          ref={inputRef}
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
      <SegmentedControl
        label={control.label}
        name={control.key}
        options={options}
        current={current}
        commit={commit}
        path={path}
        active={active}
        wrapRef={wrapRef}
        renderOption={(opt) => (
          <>
            {icon[opt] ?? null}
            <span>{opt}</span>
          </>
        )}
      />
    );
  }

  if (kind === "select") {
    const options = (control.config?.options as string[] | undefined) ?? [];
    const current = asString(value) || (control.default as string) || "";
    if (options.length > 0 && options.length <= 3) {
      return (
        <SegmentedControl
          label={control.label}
          name={control.key}
          options={options}
          current={current}
          commit={commit}
          path={path}
          active={active}
          wrapRef={wrapRef}
        />
      );
    }
    return (
      <div class={fieldClass} data-nocms-control={path} ref={wrapRef}>
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
      <div class={fieldClass} data-nocms-control={path} ref={wrapRef}>
        <MonoLabel>{control.label}</MonoLabel>
        <textarea
          ref={textareaRef}
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
      <div class={fieldClass} data-nocms-control={path} ref={wrapRef}>
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
            ref={inputRef}
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
      <div class={fieldClass} data-nocms-control={path} ref={wrapRef}>
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
    <div class={fieldClass} data-nocms-control={path} ref={wrapRef}>
      <MonoLabel>{control.label}</MonoLabel>
      <input
        ref={inputRef}
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
  path,
  focus,
}: {
  control: ControlDescriptor;
  value: unknown;
  commit: CommitValue;
  path: string;
  focus?: ContentFocus;
}): VNode {
  const active = focus?.path === path;
  const within = focus?.path?.startsWith(`${path}.`) ?? false;
  const ref = useCenterOnMatch<HTMLDivElement>(active, focus?.nonce);
  const object =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return (
    <div
      class={active || within ? "nc-group is-active" : "nc-group"}
      data-nocms-control={path}
      ref={ref}
    >
      <div class="nc-group-title">{control.label}</div>
      {(control.children ?? []).map((child) => (
        <ControlView
          key={child.key}
          control={child}
          value={object[child.key]}
          commit={(next) => commit({ ...object, [child.key]: next })}
          path={`${path}.${child.key}`}
          focus={focus}
        />
      ))}
    </div>
  );
}

/** The list item index `focus` points into, e.g. path `items`, focus `items.2.title` → 2. */
function focusedIndex(path: string, focusPath: string | undefined): number | null {
  if (!focusPath?.startsWith(`${path}.`)) return null;
  const index = Number(focusPath.slice(path.length + 1).split(".")[0]);
  return Number.isInteger(index) ? index : null;
}

/** One row of a `list`: its summary + reorder/remove controls, and its fields when expanded. The
 *  item is `is-active` (and centred) when the focus target is the item itself or a leaf inside it,
 *  so selecting an array item on the page highlights and reveals the matching row here. */
function ListItem({
  item,
  index,
  control,
  itemControl,
  path,
  focus,
  expanded,
  isLast,
  onToggle,
  onMove,
  onRemove,
  writeItem,
}: {
  item: unknown;
  index: number;
  control: ControlDescriptor;
  itemControl: ControlDescriptor | undefined;
  path: string;
  focus?: ContentFocus;
  expanded: boolean;
  isLast: boolean;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  writeItem: (next: unknown) => void;
}): VNode {
  const itemPath = `${path}.${index}`;
  const within = focus?.path?.startsWith(`${itemPath}.`) ?? false;
  const active = focus?.path === itemPath || within;
  const ref = useCenterOnMatch<HTMLDivElement>(focus?.path === itemPath, focus?.nonce);
  const fields = itemControl?.children ?? [];
  return (
    <div
      class={active ? "nc-list-item is-active" : "nc-list-item"}
      data-nocms-control={itemPath}
      ref={ref}
    >
      <div class="nc-list-row">
        <span class="nc-grip" aria-hidden="true">
          <GripIcon />
        </span>
        <button type="button" class="nc-list-label nc-list-expand" onClick={onToggle}>
          {itemSummary(item, itemControl ?? control, index)}
        </button>
        <button
          type="button"
          class="nc-iconbtn nc-list-move"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMove(-1)}
        >
          <ArrowUp size={13} />
        </button>
        <button
          type="button"
          class="nc-iconbtn nc-list-move"
          aria-label="Move down"
          disabled={isLast}
          onClick={() => onMove(1)}
        >
          <ArrowDown size={13} />
        </button>
        <button
          type="button"
          class="nc-iconbtn nc-list-remove"
          aria-label="Remove item"
          onClick={onRemove}
        >
          <TrashIcon size={13} />
        </button>
        <button
          type="button"
          class="nc-iconbtn nc-list-toggle"
          aria-expanded={expanded}
          aria-label="Edit item"
          onClick={onToggle}
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
                  writeItem({
                    ...(item as Record<string, unknown>),
                    [field.key]: next,
                  })
                }
                path={`${itemPath}.${field.key}`}
                focus={focus}
              />
            ))
          ) : itemControl ? (
            <ControlView
              control={{ ...itemControl, label: "Value" }}
              value={item}
              commit={(next) => writeItem(next)}
              path={itemPath}
              focus={focus}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ListView({
  control,
  value,
  commit,
  path,
  focus,
}: {
  control: ControlDescriptor;
  value: unknown;
  commit: CommitValue;
  path: string;
  focus?: ContentFocus;
}): VNode {
  const [open, setOpen] = useState<number | null>(null);
  // A content click into one item opens it so its fields (and the focus target) are visible. Keyed
  // on path+nonce so re-clicking the same item after collapsing it re-opens it.
  const target = focusedIndex(path, focus?.path);
  useEffect(() => {
    if (target !== null) setOpen(target);
  }, [target, focus?.nonce]);
  const items = Array.isArray(value) ? (value as unknown[]) : [];
  const itemControl = control.children?.[0];

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
        {items.map((item, index) => (
          <ListItem
            key={index}
            item={item}
            index={index}
            control={control}
            itemControl={itemControl}
            path={path}
            focus={focus}
            expanded={open === index}
            isLast={index === items.length - 1}
            onToggle={() => setOpen(open === index ? null : index)}
            onMove={(dir) => moveItem(index, dir)}
            onRemove={() => removeItem(index)}
            writeItem={(next) => writeItem(index, next)}
          />
        ))}
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
  path,
  active,
  wrapRef,
  onChange,
}: {
  control: ControlDescriptor;
  element: JsxElement;
  path: string;
  active: boolean;
  wrapRef: ReturnType<typeof useCenterOnMatch<HTMLDivElement>>;
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
    <div
      class={active ? "nc-field is-active" : "nc-field"}
      data-nocms-control={path}
      ref={wrapRef}
    >
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
  focus,
  onChange,
  onPickImage,
}: {
  control: ControlDescriptor;
  element: JsxElement;
  focus?: ContentFocus;
  onChange: () => void;
  onPickImage?: (key: string) => void;
}): VNode {
  const active = focus?.path === control.key;
  const wrapRef = useCenterOnMatch<HTMLDivElement>(active, focus?.nonce);
  if (control.kind === "layout-align") {
    return (
      <AlignMatrix
        control={control}
        element={element}
        path={control.key}
        active={active}
        wrapRef={wrapRef}
        onChange={onChange}
      />
    );
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
        path={control.key}
        focus={focus}
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
      path={control.key}
      focus={focus}
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
  /** the content leaf a canvas click landed on (`items.2.title`) + nonce, to auto-expand + focus */
  focus?: ContentFocus;
  /** fired after every edit; the shell re-serializes the doc and re-renders the canvas */
  onChange: () => void;
  /** open the media picker for an image control */
  onPickImage?: (key: string) => void;
  /** fired when a control here gains focus, with its dotted path (or `undefined`) — the shell lights
   *  up the matching leaf on the page. The reverse of `focus`. */
  onActivate?: (path: string | undefined) => void;
}

export function PropsPanel({
  element,
  component,
  meta = "SECTION",
  controls,
  focus,
  onChange,
  onPickImage,
  onActivate,
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
    <div
      class="nocms-props"
      onFocusIn={(e) => {
        if (!onActivate) return;
        const host =
          e.target instanceof Element ? e.target.closest("[data-nocms-control]") : null;
        onActivate(host?.getAttribute("data-nocms-control") ?? undefined);
      }}
    >
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
            focus={focus}
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
                    focus={focus}
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
