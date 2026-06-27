// The published page's editor entrypoint, lives in the site so it uses the site's composed
// registry — site-local components are insertable and editable on a fork. Heavy (MDX compiler +
// prose), so it's bundled at vendor time and loaded only on `?edit`, never on the reader path.

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
  // Fall back to #app for output predating the shared shell's #nocms-content slot.
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
