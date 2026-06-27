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
}

const PACKAGES: VendoredPackage[] = [
  { name: "@nocms/tokens", dir: "tokens" },
  { name: "@nocms/components", dir: "components" },
  { name: "@nocms/renderer", dir: "renderer", target: "node" },
  { name: "@nocms/build", dir: "build", target: "node" },
];

// The client JS a published page ships, bundled from the *site's* own entries (not the
// packages') so they compose the site registry — `createRegistry(core, sitePack)` — and a
// fork's own components hydrate and edit on the deployed site. preact is inlined (a static
// page has no module resolver); buildSite copies these into `dist/_nocms/`.
const STARTER_CLIENTS: { entry: string; outFile: string }[] = [
  { entry: "island.client.ts", outFile: "islands.client.js" },
  { entry: "editor.client.ts", outFile: "editor.client.js" },
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
// it's the heavy one (lazy-loaded on `?edit`). Bundled from `src/` so they compose the site
// registry; emitted into `vendor/build/` where buildSite finds and copies them into `dist`.
async function vendorStarterClient(bundle: {
  entry: string;
  outFile: string;
}): Promise<void> {
  const outDir = join(vendorDir, "build");
  await mkdir(outDir, { recursive: true });
  const built = await Bun.build({
    entrypoints: [join(starterDir, "src", bundle.entry)],
    target: "browser",
    format: "esm",
    minify: true,
    // Resolve `@nocms/*` to workspace source, not the vendored bundles: the vendored
    // renderer/build are node-targeted (they carry node:url etc.), but bundling from source
    // for the browser tree-shakes those node-only paths out — the same reason dev aliases
    // these (vite.config). A fork never runs this; it serves the committed result.
    plugins: [
      {
        name: "nocms-src-alias",
        setup(build) {
          build.onResolve({ filter: /^@nocms\// }, (args) => {
            const name = args.path.slice("@nocms/".length);
            const src = join(packagesDir, name, "src", "index.ts");
            return existsSync(src) ? { path: src } : undefined;
          });
        },
      },
    ],
  });
  if (!built.success) {
    throw new Error(
      `vendor: failed to bundle site ${bundle.outFile}\n${built.logs.join("\n")}`,
    );
  }
  const artifact = built.outputs[0];
  if (!artifact) throw new Error(`vendor: no output for site ${bundle.outFile}`);
  await writeFile(join(outDir, bundle.outFile), await artifact.text());
  console.log(`vendor: site src/${bundle.entry} → vendor/build/${bundle.outFile}`);
}

if (!existsSync(packagesDir)) {
  console.log("vendor: monorepo packages not present — using committed bundles.");
} else {
  for (const pkg of PACKAGES) {
    await vendor(pkg);
  }
  for (const bundle of STARTER_CLIENTS) {
    await vendorStarterClient(bundle);
  }
}
