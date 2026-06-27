// The site's in-site editor client (lazy, `?edit` only). It mounts the editor over the
// prerendered page using the site's composed registry, so site-local components are
// insertable and editable on a published fork — not just in the monorepo. It reads the
// page's inlined editor data (#nocms-editor-data) the build emits. Bundled at vendor time;
// heavy (MDX compiler + prose), so the reader path never loads it.

import { mountEditor } from "@nocms/editor";
import { registry } from "./registry";

const DATA_ID = "nocms-editor-data";

interface EditorData {
  mdx: string;
  tokens?: string;
}

function run(): void {
  const dataEl = document.getElementById(DATA_ID);
  const root = document.getElementById("app");
  if (!dataEl?.textContent || !root) return;

  // On a published page `#app` holds the prerendered content; clear it so the editor owns
  // a clean root (the dev `?edit` flow mounts into an empty `#app`).
  root.replaceChildren();

  const data = JSON.parse(dataEl.textContent) as EditorData;
  mountEditor({
    target: root,
    mdx: data.mdx,
    components: registry,
    tokens: data.tokens,
    onChange: (mdx) => console.info("[nocms] edited (not saved)", mdx.length, "chars"),
    onTokensChange: () => console.info("[nocms] theme edited (not saved)"),
  });
}

if (typeof document !== "undefined") run();
