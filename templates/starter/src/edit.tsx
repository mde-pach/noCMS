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
title: A CMS that lives in your repo
description: Build a real website on GitHub, edit it in place, and publish with one click.
---

<Hero title="A CMS that lives in your repo" subtitle="Build a real website on GitHub, edit it in place, and publish with one click. The repo is the database — there is nothing centralized to maintain.">
  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "1.25rem" }}>
    <Button label="Edit this page" href="?edit" variant="primary" />
    <Button label="View on GitHub" href="https://github.com/mde-pach/noCMS" variant="secondary" />
  </div>
</Hero>

<Callout variant="tip">
  **This whole page is editable.** Select any block to tweak its props, restyle the site with
  design tokens, or double-click text to rewrite it. What you preview is exactly what publishes.
</Callout>

<Divider spacing="lg" />

## One curated component library

Everything here is composed from \`@nocms/components\` — plain, typed Preact components. The
editor reads their prop types to generate controls automatically.

<Grid columns={3} gap="md">
  <Card title="Layout">
    Hero, Section, Container, Grid and Stack establish page structure and rhythm.
  </Card>
  <Card title="Content">
    Card, Callout, Badge, Image and Divider for editorial blocks.
  </Card>
  <Card title="Forms">
    Form, Input, Textarea and Select, wired to any endpoint you like.
  </Card>
</Grid>

<Divider spacing="lg" />

## Interactive islands

Components that need interactivity are declared with a single \`island: true\` flag and
hydrated in the browser, reusing the very same component.

<Counter label="You've clicked" start={0} />

<Divider spacing="lg" />

## Theming is tokens, not code

Colors, fonts, spacing and radius live in a flat \`theme.tokens\` file and compile to CSS
variables at runtime. Try the Theming panel — every block updates live, with no rebuild.

<Callout variant="info">
  Change the brand color or body font and watch the whole page restyle instantly.
</Callout>
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
  Card: {
    component: "Card",
    controls: [
      { prop: "title", kind: "text", required: false },
      { prop: "href", kind: "text", required: false },
    ],
  },
  Counter: {
    component: "Counter",
    controls: [
      { prop: "label", kind: "text", required: false },
      { prop: "start", kind: "number", required: false },
      { prop: "step", kind: "number", required: false },
    ],
  },
  Badge: {
    component: "Badge",
    controls: [
      {
        prop: "variant",
        kind: "select",
        options: ["neutral", "new", "success", "warn"],
        required: false,
      },
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
