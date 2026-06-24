// The in-site editor entry for a published static site — the deploy-time counterpart of the
// Vite dev `?edit` flow. It is lazy-loaded only when `?edit` is present (the page's bootstrap
// gates it), so readers never pay for this heavy bundle (it carries the MDX compiler + the
// prose editor). It reads the page's own inlined MDX + tokens + schemas and mounts the editor
// over the prerendered content. Editing is in-memory here — persisting to GitHub is a separate
// seam (onChange/onTokensChange are where a save flow would attach).

import { registry } from "@nocms/components";
import { type EditorOptions, mountEditor } from "@nocms/editor";

const DATA_ID = "nocms-editor-data";

interface EditorData {
  mdx: string;
  tokens?: string;
  schemas?: Record<string, unknown>;
}

export function run(): void {
  const dataEl = document.getElementById(DATA_ID);
  const root = document.getElementById("app");
  if (!dataEl?.textContent || !root) return;

  // On a published page `#app` holds the prerendered content (and any hydrated islands); the
  // dev `?edit` flow mounts into an empty `#app`. Clear it so the editor owns a clean root.
  root.replaceChildren();

  const data = JSON.parse(dataEl.textContent) as EditorData;
  const options: EditorOptions = {
    target: root,
    mdx: data.mdx,
    components: registry,
    schemas: (data.schemas ?? {}) as EditorOptions["schemas"],
    tokens: data.tokens,
    onChange: (mdx) => console.info("[nocms] edited (not saved)", mdx.length, "chars"),
    onTokensChange: () => console.info("[nocms] theme edited (not saved)"),
  };
  mountEditor(options);
}

if (typeof document !== "undefined") run();
