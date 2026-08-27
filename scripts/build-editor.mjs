import { fileURLToPath } from "node:url";
import { build } from "vite";
import astroForEditor from "./astro-plugin.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

/**
 * The editor is built as an SSR bundle that runs in a browser.
 *
 * This is the load-bearing trick: an SSR build makes every framework plugin emit
 * SSR codegen, exactly as Astro's own server build does. A plain client build
 * silently produces DOM code that cannot be rendered to a string.
 */
await build({
  root,
  logLevel: "warn",
  plugins: [astroForEditor({ root })],
  define: { "process.env.NODE_ENV": '"production"' },
  resolve: {
    alias: [
      { find: /^react-dom\/server$/, replacement: "react-dom/server.browser" },
      {
        find: /^node:async_hooks$/,
        replacement: fileURLToPath(new URL("./async-hooks-shim.mjs", import.meta.url)),
      },
    ],
  },
  ssr: { noExternal: true, target: "webworker" },
  build: {
    ssr: fileURLToPath(new URL("../editor/main.mjs", import.meta.url)),
    outDir: ".nocms-build",
    emptyOutDir: true,
    minify: true,
    target: "es2022",
    rollupOptions: { output: { entryFileNames: "editor.js", format: "es" } },
  },
});

// The compiler is WASM in the browser; ship it next to the editor.
import { copyFile, mkdir, rm } from "node:fs/promises";

const out = fileURLToPath(new URL("../public/_nocms/", import.meta.url));
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await copyFile(
  fileURLToPath(new URL("../.nocms-build/editor.js", import.meta.url)),
  `${out}editor.js`,
);
await copyFile(
  fileURLToPath(
    new URL("../node_modules/@astrojs/compiler/dist/astro.wasm", import.meta.url),
  ),
  `${out}astro.wasm`,
);
await rm(fileURLToPath(new URL("../.nocms-build", import.meta.url)), {
  recursive: true,
  force: true,
});
console.log("editor built -> public/_nocms/editor.js (+ astro.wasm)");
