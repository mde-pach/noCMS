import config from "../../nocms.config.mjs";

/**
 * The noCMS Astro integration.
 *
 * Its main job is making `nocms.config.styles` reach the BUILT page. The editor injects
 * those stylesheets into the canvas itself, so without this the two disagree in the one
 * way markup parity cannot see: the canvas shows a library's components styled and the
 * published page ships the class names with no rules behind them.
 */
export default function nocms() {
  return {
    name: "nocms",
    hooks: {
      "astro:config:setup": ({ injectRoute, injectScript, command }) => {
        // A CSS import on every page's server module; Astro bundles and links it.
        for (const sheet of config.styles ?? []) {
          const specifier =
            sheet.startsWith(".") || sheet.startsWith("/") ? sheet : `/${sheet}`;
          injectScript("page-ssr", `import ${JSON.stringify(specifier)};`);
        }

        if (command === "dev") {
          // Local mode: the dev server is the storage backend, so a developer can run
          // the editor against their working tree while editing files in an IDE.
          injectRoute({
            pattern: "/_nocms/fs",
            entrypoint: "./src/lib/fs-endpoint.ts",
          });
        }
      },
    },
  };
}
