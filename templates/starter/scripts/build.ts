// Project Pages serve under /<repo>/, so CI overrides the base via BASE_PATH; left unset, the
// config `base` applies.
import { buildSite } from "@nocms/build";
import { SiteShell } from "../src/app";
import { registry } from "../src/registry";

const root = new URL("..", import.meta.url).pathname;

await buildSite({
  root,
  outDir: new URL("../dist", import.meta.url).pathname,
  base: process.env.BASE_PATH,
  registry,
  shell: SiteShell,
});

console.log("build: prerendered site → dist/");
