/**
 * Compile the publish stylesheet for exactly the classes the prerendered pages use, through the
 * same engine the editor preview runs in-browser (`@tailwindcss/browser`) — so preview = publish
 * (invariant #1). The generated `@theme` (from `toTailwindTheme`) points utilities at the token CSS
 * variables, so this stylesheet never regenerates on a token edit — that stays a variable swap.
 *
 * `base` must resolve the `tailwindcss` package (the site root); callers gate on a `theme.tokens`
 * existing, so a site without tokens skips Tailwind entirely.
 */
export declare function tailwindCss(htmls: string[], theme: string, base: string): Promise<string>;
