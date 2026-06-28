import { parseTokens, toTailwindTheme } from "@nocms/tokens";

const STYLE_ID = "nocms-tw-theme";

/**
 * Run the Tailwind engine in the page so utilities render live — the preview half of "preview =
 * publish" (@nocms/build does the static compile at publish). The `<style type="text/tailwindcss">`
 * carries the same `@import "tailwindcss"` + generated `@theme` the build feeds its compiler, so both
 * engines produce matching CSS; the browser engine scans the DOM and re-scans on edits. Idempotent —
 * the reader and the editor (same document) can both call it.
 */
export async function ensureTailwindPreview(tokensText: string): Promise<void> {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    // A non-CSS type, so the browser ignores it as a stylesheet; the Tailwind engine reads its text.
    style.type = "text/tailwindcss";
    style.textContent = `@import "tailwindcss";\n${toTailwindTheme(parseTokens(tokensText))}`;
    document.head.appendChild(style);
  }
  await import("@tailwindcss/browser");
}
