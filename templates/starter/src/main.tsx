import { parseTokens, toCssVariables } from "@nocms/tokens";
import type { ComponentType } from "preact";
import { render } from "preact";
import Content from "../content/index.mdx";
import contentSource from "../content/index.mdx?raw";
import siteConfig from "../nocms.config.json";
import themeTokens from "../theme.tokens?raw";
import "../styles.css";
import { CONTENT_SLOT_ID, SiteShell } from "./app";
import { registry } from "./registry";

const BASE = "/";

// Dev-only parity: the published build embeds this script in <head>; the dev server serves
// `index.html` directly, so the reader injects the same object from `nocms.config.json` so the
// LanguageSwitcher/LatestPosts islands can locate the derived files served from `public/`.
function injectSiteRuntime(): void {
  if (document.getElementById("nocms-site")) return;
  const runtime: { base: string; feedUrl?: string; translationsUrl?: string } = {
    base: BASE,
  };
  if (siteConfig.siteUrl && siteConfig.feed) runtime.feedUrl = `${BASE}feed.json`;
  if (siteConfig.locales && siteConfig.locales.length >= 2) {
    runtime.translationsUrl = `${BASE}i18n/translations.json`;
  }
  const script = document.createElement("script");
  script.type = "application/json";
  script.id = "nocms-site";
  script.textContent = JSON.stringify(runtime);
  document.head.appendChild(script);
}

function componentMap(): Record<string, ComponentType> {
  return Object.fromEntries(
    Object.entries(registry).map(([name, entry]) => [name, entry.component]),
  );
}

function mountReader(): void {
  const style = document.createElement("style");
  style.textContent = toCssVariables(parseTokens(themeTokens));
  document.head.appendChild(style);
  injectSiteRuntime();

  const app = document.getElementById("app");
  if (!app) return;
  // The shell renders once and is never reconciled again; content lives in a separate root so
  // the editor can take the slot over in place.
  render(<SiteShell base={BASE} />, app);
  const host = document.getElementById(CONTENT_SLOT_ID);
  if (host) render(<Content components={componentMap()} />, host);

  wireEditing(host);
}

let editing = false;

async function enterEdit(host: HTMLElement): Promise<void> {
  if (editing) return;
  editing = true;
  const { enterEdit: mount } = await import("./edit");
  await mount({
    contentHost: host,
    mdx: contentSource,
    tokens: themeTokens,
    registry,
    base: BASE,
  });
}

// A plain left-click on an "Edit this page" link switches into edit mode over the live page —
// no navigation, no reload — so the chrome animates in over what's already on screen.
function wireEditing(host: HTMLElement | null): void {
  if (!host) return;
  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey
    ) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a");
    if (!anchor) return;
    const url = new URL(anchor.href, location.href);
    if (url.pathname !== location.pathname || !url.searchParams.has("edit")) return;
    event.preventDefault();
    history.pushState(null, "", "?edit");
    void enterEdit(host);
  });
  if (new URLSearchParams(location.search).has("edit")) void enterEdit(host);
}

// The single entry: it always renders the real page (shell + content) first, then — only on
// `?edit` — lazily pulls in the editor and enhances that very page in place. The editor bundle
// (with the MDX compiler) is behind `import("./edit")`, so the reader path never downloads it.
// Invoked last so the module's bindings (`editing`, `enterEdit`) are initialized first.
mountReader();
