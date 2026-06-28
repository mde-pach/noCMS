// Lazy-loaded only on `?edit`, so readers never pay for this heavy bundle (MDX compiler + prose
// editor). Editing is in-memory; `onChange`/`onTokensChange` are where a GitHub save flow would attach.

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

  // On a published page `#app` holds prerendered content (and hydrated islands); clear it so the
  // editor owns a clean root, matching the empty `#app` the dev `?edit` flow mounts into.
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
