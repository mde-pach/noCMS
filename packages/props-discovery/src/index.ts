// Derives editor controls by parsing a component's TypeScript prop types — no
// annotation DSL. The type picks the control: string→text, literal-union→select,
// ReactNode→slot, handler→action-binding. An optional field-config is the only
// escape hatch for what types can't express.

import type { FieldDef } from "@nocms/core";

export interface Control {
  prop: string;
  kind: "text" | "number" | "boolean" | "select" | "slot" | "action" | "media";
  /** for `select` */
  options?: string[];
  required: boolean;
  help?: string;
  group?: string;
}

export interface ComponentSchema {
  component: string;
  controls: Control[];
}

export function discoverControls(_componentSource: string): ComponentSchema {
  throw new Error("not implemented: parse TS prop types → controls");
}

/** Overlay the optional explicit field-config onto discovered controls. */
export function bridgeFieldConfig(
  schema: ComponentSchema,
  _fieldConfig?: Record<string, Partial<FieldDef>>,
): ComponentSchema {
  return schema;
}
