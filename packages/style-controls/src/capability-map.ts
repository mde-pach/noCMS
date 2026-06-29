// The capability map (data): every vertical → a compact panel of controls. Kept free of the built
// catalog and of JSX so it is importable in tests and cross-checked against the real engine.

// Each target must map to a *real* CSS property in the engine. `ring-` is deliberately absent: in
// v4 it only sets the scaffolding `--tw-ring-color`, so it isn't a standalone colour control.
export const COLOR_TARGETS = [
  { label: "Background", prefix: "bg-" },
  { label: "Text", prefix: "text-" },
  { label: "Border", prefix: "border-" },
  { label: "Underline", prefix: "decoration-" },
  { label: "Fill", prefix: "fill-" },
  { label: "Stroke", prefix: "stroke-" },
  { label: "Accent", prefix: "accent-" },
  { label: "Caret", prefix: "caret-" },
];

export type ControlDef =
  | { kind: "color" }
  | {
      kind: "box";
      box: "sides" | "corners";
      targets: Record<string, string>;
      scale: string;
      label: string;
    }
  | { kind: "slider" | "dropdown" | "segmented"; feature: string; label?: string }
  | { kind: "toggle"; feature: string; on: string; label: string };

export interface Capability {
  id: string;
  label: string;
  controls: ControlDef[];
}

const pad = { all: "p-", x: "px-", y: "py-", t: "pt-", r: "pr-", b: "pb-", l: "pl-" };
const mar = { all: "m-", x: "mx-", y: "my-", t: "mt-", r: "mr-", b: "mb-", l: "ml-" };
const rad = {
  all: "rounded-",
  tl: "rounded-tl-",
  tr: "rounded-tr-",
  br: "rounded-br-",
  bl: "rounded-bl-",
};

export const CAPABILITIES: Capability[] = [
  { id: "color", label: "Color", controls: [{ kind: "color" }] },
  {
    id: "padding",
    label: "Padding",
    controls: [
      { kind: "box", box: "sides", targets: pad, scale: "padding", label: "Padding" },
    ],
  },
  {
    id: "margin",
    label: "Margin",
    controls: [
      { kind: "box", box: "sides", targets: mar, scale: "margin", label: "Margin" },
    ],
  },
  {
    id: "gap",
    label: "Gap",
    controls: [{ kind: "slider", feature: "gap", label: "Gap" }],
  },
  {
    id: "size",
    label: "Size",
    controls: [
      { kind: "slider", feature: "width", label: "Width" },
      { kind: "slider", feature: "height", label: "Height" },
    ],
  },
  {
    id: "corners",
    label: "Corners",
    controls: [
      {
        kind: "box",
        box: "corners",
        targets: rad,
        scale: "border-radius",
        label: "Corners",
      },
    ],
  },
  {
    id: "typography",
    label: "Text",
    controls: [
      { kind: "dropdown", feature: "font-family", label: "Font" },
      { kind: "slider", feature: "font-size", label: "Size" },
      { kind: "dropdown", feature: "font-weight", label: "Weight" },
      { kind: "toggle", feature: "font-style", on: "italic", label: "Italic" },
      { kind: "segmented", feature: "text-align", label: "Align" },
      { kind: "dropdown", feature: "text-transform", label: "Case" },
    ],
  },
  {
    id: "decoration",
    label: "Decoration",
    controls: [
      { kind: "dropdown", feature: "text-decoration-line", label: "Line" },
      { kind: "dropdown", feature: "text-decoration-style", label: "Style" },
    ],
  },
  {
    id: "border",
    label: "Border",
    controls: [
      { kind: "slider", feature: "border-width", label: "Width" },
      { kind: "dropdown", feature: "border-style", label: "Style" },
    ],
  },
  {
    id: "effects",
    label: "Effects",
    controls: [
      { kind: "slider", feature: "opacity", label: "Opacity" },
      { kind: "dropdown", feature: "box-shadow", label: "Shadow" },
      { kind: "dropdown", feature: "mix-blend-mode", label: "Blend" },
    ],
  },
  {
    id: "filters",
    label: "Filters",
    controls: [{ kind: "slider", feature: "filter", label: "Blur" }],
  },
  {
    id: "transform",
    label: "Transform",
    controls: [
      { kind: "slider", feature: "rotate", label: "Rotate" },
      { kind: "slider", feature: "scale", label: "Scale" },
    ],
  },
  {
    id: "motion",
    label: "Motion",
    controls: [
      { kind: "dropdown", feature: "transition-property", label: "Transition" },
      { kind: "slider", feature: "transition-duration", label: "Duration" },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    controls: [
      { kind: "dropdown", feature: "display", label: "Display" },
      { kind: "dropdown", feature: "overflow", label: "Overflow" },
      { kind: "dropdown", feature: "position", label: "Position" },
    ],
  },
  {
    id: "interactivity",
    label: "Behavior",
    controls: [
      { kind: "dropdown", feature: "cursor", label: "Cursor" },
      { kind: "dropdown", feature: "user-select", label: "Selectable" },
    ],
  },
];

export const CAP = new Map(CAPABILITIES.map((c) => [c.id, c]));

// What shows by default for an element — a relevant few, by tag. Everything else is one search away.
const RELEVANCE: Record<string, string[]> = {
  h1: ["typography", "color", "decoration", "padding"],
  h2: ["typography", "color", "decoration"],
  h3: ["typography", "color"],
  p: ["typography", "color", "decoration"],
  span: ["typography", "color"],
  div: ["color", "padding", "size", "layout"],
  button: ["color", "padding", "corners", "effects", "typography"],
  a: ["color", "typography", "decoration"],
  section: ["color", "padding", "size", "corners", "effects", "layout"],
  header: ["color", "padding", "size", "effects", "layout"],
  footer: ["color", "padding", "size", "layout"],
  nav: ["color", "typography", "padding", "layout"],
  aside: ["color", "padding", "corners", "border", "typography"],
  figure: ["color", "padding", "corners", "effects", "border"],
  label: ["typography", "color", "padding"],
  hr: ["color", "size", "border"],
  img: ["size", "corners", "effects", "border"],
};
export function relevantFor(tag: string): string[] {
  return RELEVANCE[tag] ?? ["color", "padding", "size", "corners", "effects"];
}
