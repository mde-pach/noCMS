/**
 * The section registry.
 *
 * A RESOLUTION ORDER, not a folder scan: the owner's own sections win over any
 * installed pack. Built in from the first commit so packs are purely additive later
 * — retrofitting this would mean touching every site ever generated.
 */
const local = import.meta.glob('/src/sections/*/index.astro', { eager: true });
const localDefs = import.meta.glob('/src/sections/*/section.ts', { eager: true });
const packs = import.meta.glob('/node_modules/@nocms-pack-*/sections/*/index.astro', { eager: true });
const packDefs = import.meta.glob('/node_modules/@nocms-pack-*/sections/*/section.ts', { eager: true });

const idOf = (path) => path.replace(/.*\/sections\/([^/]+)\/.*/, '$1');

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
export const byName = Object.fromEntries(Object.values(registry).map((s) => [s.meta.name, s]));
export const list = () => Object.values(registry);

/**
 * Layouts are renderable but are not sections: the editor renders them so the canvas
 * shows the real page, and they are editable surfaces (a nav lives in one), but they
 * are not offered in the section library and are not wrapped as selectable blocks.
 */
const layoutMods = import.meta.glob('/src/layouts/*.astro', { eager: true });
export const layouts = Object.fromEntries(
  Object.entries(layoutMods).map(([path, mod]) => [
    path.replace(/.*\/layouts\/(.+)\.astro$/, '$1'),
    { name: path.replace(/.*\/layouts\/(.+)\.astro$/, '$1'), component: mod.default },
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
  }
  return registry[tag] ?? byName[tag] ?? layouts[tag] ?? null;
}

export function isSection(tag, imports = {}) {
  const from = imports[tag];
  if (from) {
    const id = sectionIdFromPath(from);
    return Boolean(id && registry[id]);
  }
  return Boolean(registry[tag] ?? byName[tag]);
}

/** Where a section lives, for writing an import when one is added to a page. */
export function importPathFor(id, pageDir = 'src/pages') {
  const depth = pageDir.split('/').length - 1;
  return '../'.repeat(depth) + `sections/${id}/index.astro`;
}
