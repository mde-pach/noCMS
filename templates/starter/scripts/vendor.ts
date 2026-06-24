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
   * An extra browser-target client bundle emitted into the same vendor dir, with preact
   * inlined (the published static site serves a flat file with no module resolver). The
   * island client lives here — the only client JS a published page ships.
   */
  clientBundle?: { entry: string; outFile: string };
}

const PACKAGES: VendoredPackage[] = [
  { name: "@nocms/tokens", dir: "tokens" },
  { name: "@nocms/components", dir: "components" },
  { name: "@nocms/renderer", dir: "renderer", target: "node" },
  {
    name: "@nocms/build",
    dir: "build",
    target: "node",
    clientBundle: { entry: "island-client.ts", outFile: "islands.client.js" },
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

  if (pkg.clientBundle) await vendorClientBundle(pkg, srcDir, outDir);

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

// The island client runs in the browser on a static page, so preact is inlined (no resolver
// at runtime) and the entry's MDX-compiler-laden imports tree-shake away (it pulls only the
// component registry + the renderer's `hydrateIslands`). buildSite copies this into `dist`.
async function vendorClientBundle(
  pkg: VendoredPackage,
  srcDir: string,
  outDir: string,
): Promise<void> {
  const bundle = pkg.clientBundle;
  if (!bundle) return;
  const built = await Bun.build({
    entrypoints: [join(srcDir, bundle.entry)],
    target: "browser",
    format: "esm",
    minify: true,
  });
  if (!built.success) {
    throw new Error(
      `vendor: failed to bundle ${pkg.name} client\n${built.logs.join("\n")}`,
    );
  }
  const artifact = built.outputs[0];
  if (!artifact) throw new Error(`vendor: no client output for ${pkg.name}`);
  await writeFile(join(outDir, bundle.outFile), await artifact.text());
  console.log(`vendor: ${pkg.name} client → vendor/${pkg.dir}/${bundle.outFile}`);
}

if (!existsSync(packagesDir)) {
  console.log("vendor: monorepo packages not present — using committed bundles.");
} else {
  for (const pkg of PACKAGES) {
    await vendor(pkg);
  }
}
