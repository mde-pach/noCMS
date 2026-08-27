/**
 * The section registry.
 *
 * A RESOLUTION ORDER, not a folder scan: the owner's own sections win over any
 * installed pack. Built in from the first commit so packs are purely additive later
 * — retrofitting this would mean touching every site ever generated.
 */
const local = import.meta.glob("/src/sections/*/index.astro", { eager: true });
const localDefs = import.meta.glob("/src/sections/*/section.ts", { eager: true });
// Components from a library, with or without a descriptor. shadcn lands here untouched.
const libComponents = import.meta.glob(
  "/src/components/**/*.{astro,tsx,jsx,vue,svelte}",
  {
    eager: true,
  },
);
const libDefs = import.meta.glob("/src/components/**/*.nocms.ts", { eager: true });
const packs = import.meta.glob("/node_modules/@nocms-pack-*/sections/*/index.astro", {
  eager: true,
});
const packDefs = import.meta.glob("/node_modules/@nocms-pack-*/sections/*/section.ts", {
  eager: true,
});

const idOf = (path) => path.replace(/.*\/sections\/([^/]+)\/.*/, "$1");

function collect(components, defs) {
  const out = {};
  for (const [path, mod] of Object.entries(components)) {
    const id = idOf(path);
    const defPath = Object.keys(defs).find((p) => idOf(p) === id);
    if (!defPath) continue;
    out[id] = { id, component: mod.default, ...defs[defPath] };
  }
  return out;
}

// Later spread wins: local overrides packs.
export const registry = { ...collect(packs, packDefs), ...collect(local, localDefs) };
export const byName = Object.fromEntries(
  Object.values(registry).map((s) => [s.meta.name, s]),
);
/** Everything offerable in the library panel: composed starting points and raw components. */
export const list = () => [...Object.values(registry), ...Object.values(library)];

/**
 * Layouts are renderable but are not sections: the editor renders them so the canvas
 * shows the real page, and they are editable surfaces (a nav lives in one), but they
 * are not offered in the section library and are not wrapped as selectable blocks.
 */
const layoutMods = import.meta.glob("/src/layouts/*.astro", { eager: true });
export const layouts = Object.fromEntries(
  Object.entries(layoutMods).map(([path, mod]) => [
    path.replace(/.*\/layouts\/(.+)\.astro$/, "$1"),
    {
      name: path.replace(/.*\/layouts\/(.+)\.astro$/, "$1"),
      component: mod.default,
      isLayout: true,
      meta: {
        name: path.replace(/.*\/layouts\/(.+)\.astro$/, "$1"),
        role: "container",
      },
    },
  ]),
);

const sectionIdFromPath = (p) => {
  const m = /\/sections\/([^/]+)\/index\.astro$/.exec(p);
  return m ? m[1] : null;
};
const layoutNameFromPath = (p) => {
  const m = /\/layouts\/([^/]+)\.astro$/.exec(p);
  return m ? m[1] : null;
};

/**
 * Resolve a tag to a component through the page's own imports. Falls back to the
 * section id only when a page has no matching binding.
 */
export function componentFor(tag, imports = {}) {
  const from = imports[tag];
  if (from) {
    const id = sectionIdFromPath(from);
    if (id && registry[id]) return registry[id];
    const layout = layoutNameFromPath(from);
    if (layout && layouts[layout]) return layouts[layout];
    const byPath = Object.values(library).find((c) =>
      from.endsWith(c.path.replace(/^\/src/, "")),
    );
    if (byPath) return byPath;
  }
  return registry[tag] ?? byName[tag] ?? library[tag] ?? layouts[tag] ?? null;
}

/**
 * Every component the editor can resolve is addressable. A descriptor adds a prop panel;
 * it never decides whether a component may be used. This is what makes an imported
 * library reachable without anyone writing metadata for it first.
 */
export function isAddressable(tag, imports = {}) {
  return Boolean(componentFor(tag, imports));
}

import { inferred } from "/@nocms/inferred";

const nameFromPath = (p) => p.replace(/.*\/([^/]+)\.[^.]+$/, "$1");

/** Components discovered from a library directory, with a descriptor only if one exists. */
function collectLibrary() {
  const out = {};
  for (const [path, mod] of Object.entries(libComponents)) {
    if (/\.nocms\.ts$/.test(path)) continue;
    const id = nameFromPath(path);
    const defPath = Object.keys(libDefs).find(
      (d) => nameFromPath(d.replace(/\.nocms$/, "")) === id,
    );
    const def = defPath ? libDefs[defPath] : {};
    out[id] = {
      id,
      path,
      component: mod.default ?? mod[id],
      schema: def.schema,
      // Read from the component's own source. A descriptor overrides these; without
      // one the component is still editable rather than merely placeable.
      inferred: inferred[id] ?? {},
      // No descriptor means no declared name or role: the filename, and the safe default.
      meta: { name: def.meta?.name ?? id, category: "Components", ...(def.meta ?? {}) },
    };
  }
  return out;
}

export const library = collectLibrary();

/**
 * Where a component lives, for writing an import when one is added to a page.
 * Composed components sit in src/sections; a library component keeps its own path,
 * so an imported library needs no special casing anywhere else.
 */
export function importPathFor(id, pageDir = "src/pages") {
  const up = "../".repeat(pageDir.split("/").length - 1);
  const fromLibrary = library[id];
  if (fromLibrary) return up + fromLibrary.path.replace(/^\/src\//, "");
  return `${up}sections/${id}/index.astro`;
}

/** The tag a component is imported as. */
export function tagFor(id) {
  return id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
