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

/** Per-prop overrides for what the prop types can't express. */
export type FieldConfig = Record<string, Partial<Pick<Control, "help" | "group">>>;

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
