import { SITE_RUNTIME_ID, type SiteRuntime } from "@nocms/core";

// The runtime config the build embeds as `<script id="nocms-site">`, used by island consumers
// to locate the ② derived files. Returns null when the script is absent (a plain site with no
// derived artifacts) or unparseable.
export function readSiteRuntime(doc: Document = document): SiteRuntime | null {
  const el = doc.getElementById(SITE_RUNTIME_ID);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as SiteRuntime;
  } catch {
    return null;
  }
}
