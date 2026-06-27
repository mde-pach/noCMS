import * as v from "valibot";
import type { CollectionDef, FieldDef } from "./index";

// Field kinds whose runtime type is a plain string carry a `control` meta-type so the
// schema→control mapper derives a rich control instead of a bare text box — without
// changing what the schema validates.
function schemaForField(field: FieldDef): v.GenericSchema {
  switch (field.kind) {
    case "string":
      return v.string();
    case "text":
      return v.pipe(v.string(), v.metadata({ control: "textarea" }));
    case "markdown":
      return v.pipe(v.string(), v.metadata({ control: "richtext" }));
    case "media":
      return v.pipe(v.string(), v.metadata({ control: "image" }));
    case "reference":
      return v.pipe(v.string(), v.metadata({ control: "reference" }));
    case "number":
      return v.number();
    case "boolean":
      return v.boolean();
    case "date":
      // YAML may yield a Date or an ISO string depending on the source.
      return v.pipe(v.union([v.string(), v.date()]), v.metadata({ control: "date" }));
    case "enum": {
      if (!field.options || field.options.length === 0) {
        throw new Error("enum field requires options");
      }
      return v.picklist(field.options);
    }
  }
}

export function schemaForCollection(def: CollectionDef): v.GenericSchema {
  const entries: Record<string, v.GenericSchema> = {};
  for (const [name, field] of Object.entries(def.fields)) {
    const base = schemaForField(field);
    entries[name] = field.required ? base : v.optional(base);
  }
  return v.object(entries);
}

/** Validate an entry's front-matter `data` against its collection; throws on mismatch. */
export function validateEntryData(
  def: CollectionDef,
  data: unknown,
): Record<string, unknown> {
  return v.parse(schemaForCollection(def), data) as Record<string, unknown>;
}
