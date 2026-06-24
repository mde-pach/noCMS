// Builds the `@nocms/*` packages a fork depends on into self-contained, installable
// `file:` packages under `vendor/`. The starter ships these *built* — a fork is not
// in the monorepo and cannot resolve `workspace:*`, so the bundles are committed and
// are the source of truth for forks (D1). preact stays external: the site provides it.
//
// In a fork the monorepo sources are absent, so this is a no-op and the committed
// bundles are used as-is. In the monorepo it regenerates them, so `predev`/`prebuild`
// always run it and a contributor's package edits flow into the starter on next run.

import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface VendoredPackage {
  name: string;
  dir: string;
  /**
   * `browser` (default) for packages the reader bundle runs; `node` for the build
   * tooling, which runs only in CI and pulls the MDX compiler + remark stack.
   */
  target?: "browser" | "node";
  /**
   * Extra browser-target client bundles emitted into the same vendor dir, with preact inlined
   * (the published static site serves flat files with no module resolver). The island client
   * and the (lazy, edit-only) editor client live here — the client JS a published page ships.
   */
  clientBundles?: { entry: string; outFile: string }[];
}

const PACKAGES: VendoredPackage[] = [
  { name: "@nocms/tokens", dir: "tokens" },
  { name: "@nocms/components", dir: "components" },
  { name: "@nocms/renderer", dir: "renderer", target: "node" },
  {
    name: "@nocms/build",
    dir: "build",
    target: "node",
    clientBundles: [
      { entry: "island-client.ts", outFile: "islands.client.js" },
      { entry: "editor-client.ts", outFile: "editor.client.js" },
    ],
  },
];

const starterDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = resolve(starterDir, "../../packages");
const vendorDir = join(starterDir, "vendor");

async function emitDeclarations(srcDir: string, outDir: string): Promise<void> {
  const proc = Bun.spawn(
    [
      "bunx",
      "tsc",
      join(srcDir, "index.ts"),
      "--declaration",
      "--emitDeclarationOnly",
      "--outDir",
      outDir,
      "--rootDir",
      srcDir,
      "--target",
      "es2022",
      "--module",
      "es2022",
      "--moduleResolution",
      "bundler",
      "--jsx",
      "react-jsx",
      "--jsxImportSource",
      "preact",
      "--skipLibCheck",
    ],
    { stdout: "inherit", stderr: "inherit" },
  );
  if ((await proc.exited) !== 0) {
    throw new Error(`vendor: tsc failed emitting declarations for ${srcDir}`);
  }
}

async function vendor(pkg: VendoredPackage): Promise<void> {
  const srcDir = join(packagesDir, pkg.dir, "src");
  const outDir = join(vendorDir, pkg.dir);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const built = await Bun.build({
    entrypoints: [join(srcDir, "index.ts")],
    target: pkg.target ?? "browser",
    format: "esm",
    minify: true,
    external: ["preact", "preact/*"],
  });
  if (!built.success) {
    throw new Error(`vendor: failed to bundle ${pkg.name}\n${built.logs.join("\n")}`);
  }
  const artifact = built.outputs[0];
  if (!artifact) throw new Error(`vendor: no output for ${pkg.name}`);
  await writeFile(join(outDir, "index.js"), await artifact.text());

  for (const bundle of pkg.clientBundles ?? []) {
    await vendorClientBundle(pkg, srcDir, outDir, bundle);
  }

  await emitDeclarations(srcDir, outDir);

  const manifest = {
    name: pkg.name,
    version: "0.0.0",
    type: "module",
    module: "./index.js",
    types: "./index.d.ts",
    exports: { ".": { types: "./index.d.ts", default: "./index.js" } },
    peerDependencies: { preact: "^10.27.0" },
  };
  await writeFile(
    join(outDir, "package.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(`vendor: ${pkg.name} → vendor/${pkg.dir}`);
}

// A client bundle runs in the browser on a static page, so preact is inlined (no resolver at
// runtime). Unused heavy imports tree-shake away — the island client keeps only the registry +
// `hydrateIslands`; the editor client necessarily carries the MDX compiler + prose editor, so
// it's the heavy one (lazy-loaded on `?edit`). buildSite copies these into `dist`.
async function vendorClientBundle(
  pkg: VendoredPackage,
  srcDir: string,
  outDir: string,
  bundle: { entry: string; outFile: string },
): Promise<void> {
  const built = await Bun.build({
    entrypoints: [join(srcDir, bundle.entry)],
    target: "browser",
    format: "esm",
    minify: true,
  });
  if (!built.success) {
    throw new Error(
      `vendor: failed to bundle ${pkg.name} ${bundle.outFile}\n${built.logs.join("\n")}`,
    );
  }
  const artifact = built.outputs[0];
  if (!artifact) throw new Error(`vendor: no output for ${pkg.name} ${bundle.outFile}`);
  await writeFile(join(outDir, bundle.outFile), await artifact.text());
  console.log(`vendor: ${pkg.name} → vendor/${pkg.dir}/${bundle.outFile}`);
}

if (!existsSync(packagesDir)) {
  console.log("vendor: monorepo packages not present — using committed bundles.");
} else {
  for (const pkg of PACKAGES) {
    await vendor(pkg);
  }
}
