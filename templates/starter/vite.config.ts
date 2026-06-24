import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

// Project Pages serve from /<repo>/, so base is set from an env var in CI and
// defaults to "/" for local dev.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [preact()],
});
