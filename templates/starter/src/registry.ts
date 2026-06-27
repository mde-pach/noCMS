// The site's composition root: the curated `core` pack plus this fork's own components.
// Every surface that needs the component set — the dev reader (main.tsx), the in-site
// editor (edit.tsx / editor.client.ts), island hydration (island.client.ts), and the
// publish prerender (scripts/build.ts) — imports this one registry, so a fork adds a
// component in exactly one place and it works everywhere (D18). No edit to @nocms/* needed.

import {
  block,
  core,
  createRegistry,
  definePack,
  defineSavedComponent,
  savedPack,
} from "@nocms/components";
import { Stat, StatSchema } from "./components/Stat";

export const sitePack = definePack({
  id: "site",
  name: "Starter site components",
  trust: "builtin",
  blocks: {
    Stat: block(Stat, {
      schema: StatSchema,
      category: "Content",
      description: "A headline statistic with a label.",
    }),
  },
});

// Saved components: opinionated specializations of curated bricks, authored as data (no code).
// "Save as component" in the editor will produce definitions like these; for now one is inlined
// to prove the spine end-to-end — it appears in the catalog and renders identically everywhere.
const saved = savedPack(
  [
    defineSavedComponent({
      name: "PrimaryCTA",
      base: "Button",
      props: { label: "Get started", href: "/signup", variant: "primary" },
      expose: ["label", "href"],
      description: "Our primary call-to-action button.",
      category: "Content",
    }),
  ],
  createRegistry(core, sitePack),
);

export const registry = createRegistry(core, sitePack, saved);
