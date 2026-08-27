import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import nocms from "./src/lib/integration.mjs";

// NOTE: the Astro version is pinned in package.json on purpose. The editor renders
// through astro/container, which is still experimental; a bump must be validated
// against the parity gate before it ships. See docs/ARCHITECTURE.md.
export default defineConfig({
  // include narrows react's check() to jsx/tsx, which otherwise throws on foreign
  // object components once a second framework is added.
  integrations: [react({ include: ["**/*.jsx", "**/*.tsx"] }), nocms()],
  scopedStyleStrategy: "attribute",
});
