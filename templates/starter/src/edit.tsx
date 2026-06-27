// In-site editor mode (dev/monorepo). Reached at `?edit`; the published reader path
// (main.tsx / scripts/build.ts) is untouched. The editor previews with the same
// renderer the build prerenders with, so what you edit is what publishes.
//
// Controls derive live from each block's valibot schema (D9), carried on the composed
// `registry` — including this fork's own components — so there is no separate schema file to
// keep in sync. Loading the editor (it pulls the MDX compiler) is gated behind `?edit`, so
// the reader bundle never carries it.

import { registryManifest } from "@nocms/components";
import {
  EDITOR_CSS,
  FONTS_HREF,
  type LibraryEntry,
  LibraryManager,
  mountEditor,
  SignInGate,
} from "@nocms/editor";
import { render } from "preact";
import themeTokens from "../theme.tokens?raw";
import { registry } from "./registry";

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

<Section tone="muted" padding="lg">
  <Image src="https://placehold.co/640x280/4b3fd6/ffffff?text=noCMS" alt="A placeholder banner" rounded={true} />
  <Button label="Get started" href="https://example.com" variant="primary" />
</Section>

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

// The standalone editor screens (sign-in gate, library manager) need the editor's
// stylesheet and fonts present before mountEditor injects them, so set them up once here.
function ensureChrome(): void {
  if (!document.getElementById("nocms-editor-css")) {
    const style = document.createElement("style");
    style.id = "nocms-editor-css";
    style.textContent = EDITOR_CSS;
    document.head.appendChild(style);
  }
  if (!document.querySelector("link[data-nocms-fonts]")) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    link.setAttribute("data-nocms-fonts", "");
    document.head.appendChild(link);
  }
}

const SIGNED_IN_KEY = "nocms-dev-signed-in";

function libraries(): LibraryEntry[] {
  return [
    {
      id: "core",
      name: "Core",
      version: "2.4.0",
      verified: true,
      blocks: registryManifest(registry).length,
      description:
        "The curated noCMS component library — heroes, sections, content, and forms.",
      builtin: true,
    },
    {
      id: "studio",
      name: "Studio Pack",
      version: "1.1.0",
      verified: true,
      blocks: 9,
      description:
        "Editorial extras: testimonials, pricing FAQ, and richer social proof.",
      builtin: false,
    },
  ];
}

function startEditor(root: HTMLElement): void {
  root.replaceChildren();
  mountEditor({
    target: root,
    mdx: content,
    components: registry,
    onChange: (mdx) => console.info("[nocms] content edited", mdx.length, "chars"),
    tokens: themeTokens,
    onTokensChange: () => console.info("[nocms] theme edited"),
  });
}

const root = document.getElementById("app");
if (root) {
  ensureChrome();
  const params = new URLSearchParams(window.location.search);
  if (params.has("libraries")) {
    render(
      <LibraryManager
        libraries={libraries()}
        onBack={() => {
          window.location.search = "?edit";
        }}
        onAdd={() => console.info("[nocms] add a library")}
        onRemove={(id) => console.info("[nocms] remove library", id)}
      />,
      root,
    );
  } else if (sessionStorage.getItem(SIGNED_IN_KEY) !== "1") {
    render(
      <SignInGate
        siteHost="nocms.github.io"
        onContinue={() => {
          sessionStorage.setItem(SIGNED_IN_KEY, "1");
          render(null, root);
          startEditor(root);
        }}
      />,
      root,
    );
  } else {
    startEditor(root);
  }
}
