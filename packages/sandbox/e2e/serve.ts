// Bundles the package for the browser and serves the E2E harness. Run with
// `bun run e2e/serve.ts`; open the printed URL (or drive it with a browser) to
// exercise the real iframe path — port handoff, capability enforcement across
// the frame boundary, and CSP network denial. Prints a port so a driver can
// pass `--port`.

const PORT = Number(process.env.PORT ?? 4321);

const bundle = await Bun.build({
  entrypoints: [new URL("../src/index.ts", import.meta.url).pathname],
  target: "browser",
});
const out = bundle.outputs[0];
if (!bundle.success || !out) {
  console.error(bundle.logs);
  process.exit(1);
}
const sandboxJs = await out.text();

const dir = new URL(".", import.meta.url).pathname;
const file = (name: string) => Bun.file(`${dir}${name}`);

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === "/sandbox.js") {
      return new Response(sandboxJs, {
        headers: { "content-type": "text/javascript" },
      });
    }
    if (path === "/guest.html") return new Response(file("guest.html"));
    return new Response(file("host.html"), {
      headers: { "content-type": "text/html" },
    });
  },
});

console.log(`e2e harness: http://localhost:${server.port}/`);
