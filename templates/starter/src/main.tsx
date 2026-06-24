import { registry } from "@nocms/components";
import { parseTokens, toCssVariables } from "@nocms/tokens";
import type { ComponentType } from "preact";
import { render } from "preact";
import Content from "../content/index.mdx";
import themeTokens from "../theme.tokens?raw";
import "../styles.css";
import { App } from "./app";

// `?edit` loads the in-site editor instead of the reader. It's a separate, lazily
// imported entry so the published reader path stays untouched and never bundles the
// editor (which pulls the MDX compiler).
if (new URLSearchParams(location.search).has("edit")) {
  import("./edit");
} else {
  mountReader();
}

function mountReader(): void {
  const style = document.createElement("style");
  style.textContent = toCssVariables(parseTokens(themeTokens));
  document.head.appendChild(style);

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
