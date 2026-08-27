/**
 * Astro's framework integrations inject virtual modules at build time. The editor build
 * is not an Astro build, so it must provide them itself.
 *
 * Declared per framework rather than hardcoded in the build, so adding a library that
 * needs a different framework is a data change, not a code change.
 */
export const RENDERER_SHIMS = {
  react: {
    "astro:react:opts": () =>
      JSON.stringify({
        // Must match astro.config: react's check() reads Component["$$typeof"] and
        // throws on foreign object components, so it has to be narrowed by extension.
        include: ["**/*.jsx", "**/*.tsx"],
        experimentalReactChildren: false,
        experimentalDisableStreaming: false,
      }),
  },
  vue: {
    "astro:vue:opts": () => "{}",
    "virtual:astro:vue-app": () => null, // raw module, see below
  },
  svelte: {
    "astro:svelte:opts": () => "{}",
  },
};

/** Modules that must be emitted as source rather than a default-exported value. */
export const RAW_SHIMS = {
  "virtual:astro:vue-app": "export const setup = () => {};",
};

export function shimPlugin(frameworks) {
  const ids = new Map();
  for (const framework of frameworks) {
    for (const [id, value] of Object.entries(RENDERER_SHIMS[framework] ?? {})) {
      ids.set(id, value);
    }
  }
  return {
    name: "nocms-renderer-shims",
    resolveId: (id) => (ids.has(id) ? `\0${id}` : null),
    load(id) {
      if (!id.startsWith("\0")) return null;
      const key = id.slice(1);
      if (!ids.has(key)) return null;
      if (RAW_SHIMS[key]) return RAW_SHIMS[key];
      return `export default ${ids.get(key)()}`;
    },
  };
}

/**
 * Which frameworks the editor must support.
 *
 * Read from the config as plain data — importing the renderers module here would pull
 * in @astrojs/react, which imports a virtual module Node cannot resolve.
 */
export async function declaredFrameworks(root) {
  const config = await import(new URL("../nocms.config.mjs", root).href);
  return config.default.renderers ?? [];
}
