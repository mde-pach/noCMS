// The site's composition root: the curated `core` pack plus this fork's own components. Every
// surface that needs the component set — the dev reader, the in-site editor, island hydration,
// the publish prerender — imports this one registry, so a fork adds a component in one place and
// it works everywhere, with no edit to @nocms/*.

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

// Saved components are specializations of curated bricks authored as data, not code — what
// "Save as component" in the editor will produce. One is inlined here to prove the spine
// end-to-end ahead of that flow.
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
