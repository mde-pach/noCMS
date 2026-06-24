// Derives editor controls by parsing a component's TypeScript prop types — no
// annotation DSL. The type picks the control: string→text, literal-union→select,
// ReactNode→slot, handler→action-binding. An optional field-config is the only
// escape hatch for what types can't express.

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

export { type DiscoverOptions, discoverControls } from "./discover";

/** The thin escape hatch: per-prop overrides for what types can't express. */
export type FieldConfig = Record<string, Partial<Pick<Control, "help" | "group">>>;

/** Overlay the optional field-config onto discovered controls. */
export function bridgeFieldConfig(
  schema: ComponentSchema,
  fieldConfig?: FieldConfig,
): ComponentSchema {
  if (!fieldConfig) return schema;
  return {
    ...schema,
    controls: schema.controls.map((control) => {
      const overrides = fieldConfig[control.prop];
      return overrides ? { ...control, ...overrides } : control;
    }),
  };
}
