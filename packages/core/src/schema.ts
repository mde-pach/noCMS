import * as v from "valibot";
import type { CollectionDef, FieldDef } from "./index";

function schemaForField(field: FieldDef): v.GenericSchema {
  switch (field.kind) {
    case "string":
    case "text":
    case "markdown":
    case "reference":
    case "media":
      return v.string();
    case "number":
      return v.number();
    case "boolean":
      return v.boolean();
    case "date":
      // YAML may yield a Date or an ISO string depending on the source.
      return v.union([v.string(), v.date()]);
    case "enum": {
      if (!field.options || field.options.length === 0) {
        throw new Error("enum field requires options");
      }
      return v.picklist(field.options);
    }
  }
}

/** Build a valibot object schema from a collection definition. */
export function schemaForCollection(def: CollectionDef): v.GenericSchema {
  const entries: Record<string, v.GenericSchema> = {};
  for (const [name, field] of Object.entries(def.fields)) {
    const base = schemaForField(field);
    entries[name] = field.required ? base : v.optional(base);
  }
  return v.object(entries);
}

/** Validate an entry's front-matter `data` against its collection. Throws on mismatch. */
export function validateEntryData(
  def: CollectionDef,
  data: unknown,
): Record<string, unknown> {
  return v.parse(schemaForCollection(def), data) as Record<string, unknown>;
}
