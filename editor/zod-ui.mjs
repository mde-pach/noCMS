/**
 * Reading a Zod 4 schema for UI purposes.
 *
 * `.default()`, `.optional()` and friends wrap the real type, so the panel has to peel
 * them before it can ask what a field actually is. Zod exposes this through `def.type`
 * and `def.innerType`; relying on `.unwrap()` chains is accidental and peels too far.
 */
const WRAPPERS = new Set([
  "default",
  "optional",
  "nullable",
  "catch",
  "readonly",
  "prefault",
]);

export function unwrapType(type) {
  let core = type;
  while (core?.def && WRAPPERS.has(core.def.type)) core = core.def.innerType;
  return core;
}

/** Options of an enum field, or null if it is not one. */
export function enumOptions(type) {
  const core = unwrapType(type);
  if (core?.def?.type !== "enum") return null;
  return core.options ?? Object.values(core.def.entries ?? {});
}

/** Shape of the objects in an array field, or null if it is not one. */
export function listItemShape(type) {
  const core = unwrapType(type);
  if (core?.def?.type !== "array") return null;
  return unwrapType(core.def.element)?.shape ?? null;
}

/** The UI intent a section author attached with .meta(). */
export function uiMeta(type) {
  return (typeof type?.meta === "function" ? type.meta() : null) ?? {};
}
