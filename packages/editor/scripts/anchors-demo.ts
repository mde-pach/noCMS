/**
 * End-to-end proof on a real curated component. Enumerates content paths from Features'
 * actual valibot schema, then probes its actual render to anchor each path to a DOM tag.
 * Run: bun run scripts/anchors-demo.ts
 */

import { Features, FeaturesSchema } from "@nocms/components";
import { enumerateContentPaths } from "@nocms/core";
import { probeContentAnchors } from "@nocms/renderer";
import { h } from "preact";
import * as v from "valibot";

const props = v.getDefaults(FeaturesSchema) as Record<string, unknown>;

const paths = enumerateContentPaths(FeaturesSchema, props);
const anchors = probeContentAnchors((p) => h(Features, p), props, paths);

const valueByPath = new Map(paths.map((p) => [p.path, p.value]));

console.log(
  `\nFeatures — ${paths.length} content paths enumerated from schema + defaults:\n`,
);
for (const a of anchors) {
  const mark = a.found ? `→ <${a.enclosingTag}>` : "→ (not in output; parent fallback)";
  const value = JSON.stringify(valueByPath.get(a.path)?.slice(0, 32));
  console.log(`  ${a.path.padEnd(16)} ${mark.padEnd(22)} ${value}`);
}

const found = anchors.filter((a) => a.found).length;
console.log(`\n${found}/${anchors.length} leaves anchored to a DOM node.\n`);
