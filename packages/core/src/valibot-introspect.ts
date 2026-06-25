// The one place that reads valibot's internal schema shape. Control derivation
// (controls.ts) sees only these helpers, so a valibot version bump is contained
// here instead of rippling through the editor. Verified against valibot ^1.4.

import { type GenericSchema, getDefault } from "valibot";

interface PipeAction {
  type: string;
  metadata?: unknown;
  requirement?: unknown;
}

interface RawSchema {
  type: string;
  wrapped?: GenericSchema;
  options?: readonly unknown[];
  item?: GenericSchema;
  entries?: Record<string, GenericSchema>;
  pipe?: readonly PipeAction[];
}

const raw = (schema: GenericSchema): RawSchema => schema as unknown as RawSchema;

export interface Unwrapped {
  schema: GenericSchema;
  /** false when the field was wrapped in optional/nullable/nullish. */
  required: boolean;
}

/** Strip optional/nullable/nullish wrappers, recording whether the field is required. */
export function unwrap(schema: GenericSchema): Unwrapped {
  let current = schema;
  let required = true;
  let t = raw(current).type;
  while (t === "optional" || t === "nullable" || t === "nullish") {
    required = false;
    const inner = raw(current).wrapped;
    if (!inner) break;
    current = inner;
    t = raw(current).type;
  }
  return { schema: current, required };
}

export function baseType(schema: GenericSchema): string {
  return raw(schema).type;
}

/** The default value of a (possibly optional) schema, or undefined if none. */
export function defaultOf(schema: GenericSchema): unknown {
  return getDefault(schema as Parameters<typeof getDefault>[0]);
}

/** Merge the objects from every `v.metadata()` action in the schema's pipe. */
export function controlMetadata(schema: GenericSchema): Record<string, unknown> {
  const pipe = raw(schema).pipe;
  if (!pipe) return {};
  const acc: Record<string, unknown> = {};
  for (const action of pipe) {
    if (
      action.type === "metadata" &&
      action.metadata &&
      typeof action.metadata === "object"
    ) {
      Object.assign(acc, action.metadata as Record<string, unknown>);
    }
  }
  return acc;
}

/** `min`/`max` from minValue/maxValue actions, for a `range` control. */
export function numericBounds(schema: GenericSchema): { min?: number; max?: number } {
  const pipe = raw(schema).pipe;
  const out: { min?: number; max?: number } = {};
  if (!pipe) return out;
  for (const action of pipe) {
    if (action.type === "min_value" && typeof action.requirement === "number") {
      out.min = action.requirement;
    }
    if (action.type === "max_value" && typeof action.requirement === "number") {
      out.max = action.requirement;
    }
  }
  return out;
}

export function picklistOptions(schema: GenericSchema): string[] | undefined {
  const options = raw(schema).options;
  return options ? options.map((o) => String(o)) : undefined;
}

export function objectEntries(
  schema: GenericSchema,
): Record<string, GenericSchema> | undefined {
  return raw(schema).entries;
}

export function arrayItem(schema: GenericSchema): GenericSchema | undefined {
  return raw(schema).item;
}
