// The site's in-site editor client (lazy, `?edit` only). On a published page it enhances the
// prerendered page *in place* — the same shell and content visitors see — using the site's
// composed registry, so site-local components are insertable and editable on a fork. It reads
// the page's inlined editor data (#nocms-editor-data) the build emits. Bundled at vendor time;
// heavy (MDX compiler + prose), so the reader path never loads it.

import { CONTENT_SLOT_ID } from "./app";
import { enterEdit } from "./edit";
import { registry } from "./registry";

const DATA_ID = "nocms-editor-data";

interface EditorData {
  mdx: string;
  tokens?: string;
}

function run(): void {
  const dataEl = document.getElementById(DATA_ID);
  // The shared shell wraps content in #nocms-content; fall back to #app for older output.
  const host =
    document.getElementById(CONTENT_SLOT_ID) ?? document.getElementById("app");
  if (!dataEl?.textContent || !host) return;

  const data = JSON.parse(dataEl.textContent) as EditorData;
  void enterEdit({
    contentHost: host as HTMLElement,
    mdx: data.mdx,
    tokens: data.tokens ?? "",
    registry,
    base: document.querySelector("base")?.getAttribute("href") ?? "/",
  });
}

if (typeof document !== "undefined") run();
