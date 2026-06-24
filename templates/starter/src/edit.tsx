// In-site editor mode (dev/monorepo). Reached at `?edit`; the published reader path
// (main.tsx / scripts/build.ts) is untouched. The editor previews with the same
// renderer the build prerenders with, so what you edit is what publishes.
//
// Schemas are injected, not discovered live (props-discovery parses TS source via the
// compiler — a Node step, impractical in-browser). These are hand-authored for the
// starter's three components; wiring build-time discovery + vendoring the editor into a
// fork is the open follow-up. Loading the editor (it pulls the MDX compiler) is gated
// behind `?edit`, so the reader bundle never carries it.

import { registry } from "@nocms/components";
import { mountEditor } from "@nocms/editor";
import type { ComponentSchema } from "@nocms/props-discovery";
import themeTokens from "../theme.tokens?raw";

// The editor edits MDX *text*. In the real editor that text comes from the GitHub API
// (the repo is the database). Bundling it via `index.mdx?raw` would be the dev shim, but
// the build lane's `@mdx-js/rollup` plugin (enforce:pre, owned by vite.config) compiles
// every `.mdx` request — query and all — so `?raw` yields a component, not text. Rather
// than touch the build config, this dev harness mirrors `content/index.mdx` as text;
// loading real content from GitHub is the integration follow-up (see DECISIONS D2).
const content = `---
title: Welcome
description: The starter home page.
---

# Welcome to your noCMS site

Edit this content in-site. It is plain **MDX** — Markdown plus components from your library.

<Callout variant="tip">
  Components like this one come from \`@nocms/components\` and are composed visually in the editor.
</Callout>

Publishing commits your changes and builds the public site in GitHub Actions.

<Button label="Read the docs" href="https://github.com" variant="primary" />
`;

const schemas: Record<string, ComponentSchema> = {
  Button: {
    component: "Button",
    controls: [
      { prop: "label", kind: "text", required: true },
      { prop: "href", kind: "text", required: false },
      {
        prop: "variant",
        kind: "select",
        options: ["primary", "secondary"],
        required: false,
      },
    ],
  },
  Callout: {
    component: "Callout",
    controls: [
      {
        prop: "variant",
        kind: "select",
        options: ["info", "warn", "tip"],
        required: true,
      },
    ],
  },
  Hero: {
    component: "Hero",
    controls: [
      { prop: "title", kind: "text", required: true },
      { prop: "subtitle", kind: "text", required: false },
    ],
  },
};

const root = document.getElementById("app");
if (root) {
  mountEditor({
    target: root,
    mdx: content,
    components: registry,
    schemas,
    onChange: (mdx) => console.info("[nocms] content edited", mdx.length, "chars"),
    tokens: themeTokens,
    onTokensChange: () => console.info("[nocms] theme edited"),
  });
}
