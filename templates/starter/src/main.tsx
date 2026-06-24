import { registry } from "@nocms/components";
import { parseTokens, toCssVariables } from "@nocms/tokens";
import type { ComponentType } from "preact";
import { render } from "preact";
import Content from "../content/index.mdx";
import themeTokens from "../theme.tokens?raw";
import { App } from "./app";

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
