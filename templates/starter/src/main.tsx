import { parseTokens, toCssVariables } from "@nocms/tokens";
import type { ComponentType } from "preact";
import { render } from "preact";
import Content from "../content/index.mdx";
import siteConfig from "../nocms.config.json";
import themeTokens from "../theme.tokens?raw";
import "../styles.css";
import { App } from "./app";
import { registry } from "./registry";

// `?edit` loads the in-site editor instead of the reader. It's a separate, lazily
// imported entry so the published reader path stays untouched and never bundles the
// editor (which pulls the MDX compiler).
if (new URLSearchParams(location.search).has("edit")) {
  import("./edit");
} else {
  mountReader();
}

// Dev-only parity: the published build embeds this script in <head>; the dev server serves
// `index.html` directly, so the reader injects the same object from `nocms.config.json` so the
// LanguageSwitcher/LatestPosts islands can locate the derived files served from `public/`.
function injectSiteRuntime(): void {
  if (document.getElementById("nocms-site")) return;
  const base = "/";
  const runtime: { base: string; feedUrl?: string; translationsUrl?: string } = {
    base,
  };
  if (siteConfig.siteUrl && siteConfig.feed) runtime.feedUrl = `${base}feed.json`;
  if (siteConfig.locales && siteConfig.locales.length >= 2) {
    runtime.translationsUrl = `${base}i18n/translations.json`;
  }
  const script = document.createElement("script");
  script.type = "application/json";
  script.id = "nocms-site";
  script.textContent = JSON.stringify(runtime);
  document.head.appendChild(script);
}

function mountReader(): void {
  const style = document.createElement("style");
  style.textContent = toCssVariables(parseTokens(themeTokens));
  document.head.appendChild(style);
  injectSiteRuntime();

  // MDX tags (<Callout/>, <Button/>) resolve to the curated component library.
  const components: Record<string, ComponentType> = Object.fromEntries(
    Object.entries(registry).map(([name, entry]) => [name, entry.component]),
  );

  const root = document.getElementById("app");
  if (root) {
    render(
      <App>
        <Content components={components} />
      </App>,
      root,
    );
  }
}
