import { parseTokens, toCssVariables } from "@nocms/tokens";
import { render } from "preact";
import Content from "../content/index.mdx";
import themeTokens from "../theme.tokens?raw";
import { App } from "./app";

const style = document.createElement("style");
style.textContent = toCssVariables(parseTokens(themeTokens));
document.head.appendChild(style);

const root = document.getElementById("app");
if (root) {
  render(
    <App>
      <Content />
    </App>,
    root,
  );
}
