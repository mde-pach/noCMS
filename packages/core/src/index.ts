import * as v from "valibot";

/** A GitHub repository the owner edits. */
export interface RepoRef {
  owner: string;
  repo: string;
  /** Default `main`; an editing session works on its own branch. */
  branch: string;
}

/** A repo-root-relative, POSIX-separated path. */
export type RepoPath = string & { readonly __brand: "RepoPath" };

/** Where a transformation runs in the pipeline. */
export const Tier = {
  /** view-time, in the browser: render, routing, CSS-var theming. No build. */
  Client: 1,
  /** ahead-of-time, in Actions: search, i18n, manifests, feeds. Output is files. */
  Batch: 2,
  /** per publish: static HTML, image optimization. */
  Build: 3,
} as const;
export type Tier = (typeof Tier)[keyof typeof Tier];

/** Field types a collection declares. Drives editor controls and validation. */
export type FieldKind =
  | "string"
  | "text"
  | "markdown"
  | "number"
  | "boolean"
  | "date"
  | "enum"
  | "reference"
  | "media";

export interface FieldDef {
  kind: FieldKind;
  required?: boolean;
  /** for `enum` */
  options?: string[];
  /** for `reference` — the collection it points at */
  collection?: string;
  help?: string;
}

export interface CollectionDef {
  /** stable id, e.g. `posts` */
  name: string;
  // glob under the repo, e.g. content/posts/**/*.mdx
  path: string;
  fields: Record<string, FieldDef>;
}

/** A resolved entry: front-matter `data` plus the MDX `body`. */
export interface CollectionEntry {
  collection: string;
  path: RepoPath;
  data: Record<string, unknown>;
  body: string;
}

export const FieldDefSchema: v.GenericSchema<FieldDef> = v.object({
  kind: v.picklist([
    "string",
    "text",
    "markdown",
    "number",
    "boolean",
    "date",
    "enum",
    "reference",
    "media",
  ]),
  required: v.optional(v.boolean()),
  options: v.optional(v.array(v.string())),
  collection: v.optional(v.string()),
  help: v.optional(v.string()),
});

export const CollectionDefSchema: v.GenericSchema<CollectionDef> = v.object({
  name: v.string(),
  path: v.string(),
  fields: v.record(v.string(), FieldDefSchema),
});

export function parseCollectionDef(input: unknown): CollectionDef {
  return v.parse(CollectionDefSchema, input);
}

/** A host capability a plugin may request. `network` is deny-by-default. */
export type Capability =
  | "components:register"
  | "content:read"
  | "tokens:contribute"
  | "layout:contribute"
  | "network";

export interface PluginManifest {
  name: string;
  version: string;
  /** integrity hash recorded in the site repo for reproducible installs. */
  integrity: string;
  capabilities: Capability[];
}

export { type ParsedDocument, parseEntry, parseFrontmatter } from "./content";
export {
  type ContentPath,
  contentPathsFromControls,
  enumerateContentPaths,
  enumerateItemPaths,
  type ItemPath,
} from "./content-paths";
export {
  type ControlDescriptor,
  type ControlKind,
  deriveControls,
  KNOWN_CONTROL_KINDS,
  type ShowIf,
} from "./controls";
export {
  contentPathToRoute,
  href,
  type LocaleLink,
  type LocaleManifest,
  localeLinks,
  normalizeRoutePath,
  type RoutePath,
  routeFromPathname,
  routeToContentPath,
} from "./route";
export { schemaForCollection, validateEntryData } from "./schema";
export {
  type FeedConfig,
  loadSiteConfig,
  parseSiteConfig,
  SITE_RUNTIME_ID,
  type SiteConfig,
  type SiteRuntime,
  siteRuntime,
} from "./site-config";
