/**
 * The site's rendering environment.
 *
 * This is the whole contract for using an external component library. The build already
 * handles libraries — that is Astro's job. What this declares is how the EDITOR reproduces
 * the same environment, so the canvas and the published page cannot disagree.
 *
 * Each library fills a different subset:
 *   shadcn   renderers + styles + tokens   (source copied into src/components)
 *   daisyUI  styles + tokens               (no framework at all)
 *   HyperUI  nothing                       (markup pasted into an .astro component)
 */
export default {
  /** Frameworks used by components. Order is applied automatically: React last. */
  renderers: ["react"],

  /** Where components are discovered, in addition to src/sections. */
  components: ["src/components/**/*.{astro,tsx,jsx,vue,svelte}"],

  /** Stylesheets that must reach the built page AND the editor canvas. */
  styles: [
    "src/styles/theme.css",
    "src/styles/components.css",
    "src/styles/daisy-like.css",
  ],

  /**
   * Map the library's own tokens onto noCMS tokens, so "change the colours once"
   * still moves the library's components. CSS variables only — a library themed
   * through a JS object would need a provider, which v1 does not support.
   */
  tokens: { "--primary": "var(--brand)" },
};
