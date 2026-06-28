// Pure transform for "save as component": given the selected block and which props to expose, it
// produces the SavedDef the registry loads (the shell owns the side effects). A container saved
// with `slot` becomes a composed component that keeps an editable child region; anything else
// becomes a specialized leaf with its locked props baked in.

import {
  type BlockDef,
  type ComposedComponentDef,
  controlsOf,
  defineSavedComponent,
  type PropPrimitive,
  type PropSlot,
  type SavedDef,
} from "@nocms/components";
import { getProp, type JsxElement, type PropValue } from "./jsx-attributes.js";

function isPrimitive(value: PropValue | undefined): value is PropPrimitive {
  return (
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  );
}

/** The base's current prop values, falling back to each control's default — the locked props a
 *  saved component bakes in (only the ones a scalar control can represent). */
export function currentProps(
  node: JsxElement,
  baseDef: BlockDef,
): Record<string, PropPrimitive> {
  const props: Record<string, PropPrimitive> = {};
  for (const control of controlsOf(baseDef)) {
    const value =
      getProp(node, control.key) ?? (control.default as PropValue | undefined);
    if (isPrimitive(value)) props[control.key] = value;
  }
  return props;
}

/** The SavedDef for the selection: a composed (slot) wrapper when `slot`, else a specialized leaf.
 *  Returns the locked props too, so the caller can stamp the exposed ones onto the new instance. */
export function buildSavedComponentDef(args: {
  name: string;
  base: string;
  baseDef: BlockDef;
  node: JsxElement;
  exposed: string[];
  slot: boolean;
}): { def: SavedDef; props: Record<string, PropPrimitive> } {
  const { name, base, baseDef, node, exposed, slot } = args;
  const props = currentProps(node, baseDef);

  if (slot) {
    const structureProps: Record<string, PropSlot> = {};
    for (const control of controlsOf(baseDef)) {
      if (exposed.includes(control.key)) {
        structureProps[control.key] = { exposed: control.key };
      } else if (props[control.key] !== undefined) {
        structureProps[control.key] = { fixed: props[control.key] as PropPrimitive };
      }
    }
    const def: ComposedComponentDef = {
      name,
      structure: {
        kind: "component",
        component: base,
        props: structureProps,
        children: [{ kind: "slot" }],
      },
      controls: controlsOf(baseDef)
        .filter((c) => exposed.includes(c.key))
        .map((c) => ({ ...c, default: props[c.key] })),
      slot: true,
      description: `Saved from ${base}.`,
      category: "Saved",
    };
    return { def, props };
  }

  return {
    def: defineSavedComponent({
      name,
      base,
      props,
      expose: exposed,
      description: `Saved from ${base}.`,
      category: "Saved",
    }),
    props,
  };
}
