/**
 * What the panel offers for a component, in order of authority:
 *
 *   1. a descriptor's Zod schema — the author said exactly what this is
 *   2. props inferred from the component's own source — no descriptor needed
 *   3. props present on this instance — someone wrote it by hand, so let them edit it
 *
 * A descriptor is therefore an override, not the price of admission: an imported
 * library is editable the moment it is reachable.
 */
import { enumOptions, listItemShape, uiMeta } from "./zod-ui.mjs";

const label = (name) =>
  name
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

export function fieldsFor(def, node) {
  const fields = [];
  const seen = new Set();

  const shape = def?.schema?.shape ?? {};
  for (const [name, zodType] of Object.entries(shape)) {
    const ui = uiMeta(zodType);
    fields.push({
      name,
      source: "schema",
      label: ui.label ?? label(name),
      field: ui.field ?? "text",
      options: enumOptions(zodType) ?? undefined,
      itemShape: listItemShape(zodType) ?? undefined,
      itemLabel: ui.itemLabel,
    });
    seen.add(name);
  }

  for (const [name, meta] of Object.entries(def?.inferred ?? {})) {
    if (seen.has(name)) continue;
    fields.push({
      name,
      source: "inferred",
      label: label(name),
      field: meta.field ?? "text",
      options: meta.options,
      placeholder: meta.default === undefined ? undefined : String(meta.default),
    });
    seen.add(name);
  }

  for (const name of Object.keys(node?.props ?? {})) {
    if (seen.has(name) || name === "slot") continue;
    fields.push({ name, source: "instance", label: label(name), field: "text" });
    seen.add(name);
  }

  return fields;
}

/** Shown when a component genuinely offers nothing to edit. */
export function emptyReason(def, node) {
  if (!def) return `${node?.name} is not a component the editor can resolve.`;
  return `${node?.name} takes no properties.`;
}
