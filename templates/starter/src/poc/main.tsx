import { parseTokens, toCssVariables } from "@nocms/tokens";
import { render } from "preact";
import { useState } from "preact/hooks";
import themeTokens from "../../theme.tokens?raw";
import { toTailwindTheme } from "./theme";

const tokens = parseTokens(themeTokens);

// The noCMS runtime variables (`:root { --color-brand-500: … }`) — the values Tailwind utilities
// point back at via the `@theme inline` bridge.
const vars = document.createElement("style");
vars.textContent = toCssVariables(tokens);
document.head.appendChild(vars);

// Read by @tailwindcss/browser to know which utilities to generate.
const theme = document.createElement("style");
theme.setAttribute("type", "text/tailwindcss");
theme.textContent = toTailwindTheme(tokens);
document.head.appendChild(theme);

function Demo() {
  // Proves the linchpin: swapping a token value restyles every `bg-brand-500` element with no
  // Tailwind recompile — the utility resolves to this live `--color-brand-500`.
  const [flipped, setFlipped] = useState(false);
  const flip = () => {
    const next = !flipped;
    setFlipped(next);
    document.documentElement.style.setProperty(
      "--color-brand-500",
      next ? "#e0512f" : "",
    );
  };

  return (
    <main
      class="bg-bg text-text font-body"
      style={{ minHeight: "100vh", padding: "var(--space-xl)" }}
    >
      <div
        class="gap-md"
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "640px",
          margin: "0 auto",
        }}
      >
        <h1 class="font-heading text-text" style={{ fontSize: "2rem", margin: 0 }}>
          Tailwind ↔ token bridge
        </h1>
        <p class="text-text" style={{ opacity: 0.7, margin: 0 }}>
          Every class below is a real Tailwind v4 utility, generated in-browser from the
          flat token file. No build step.
        </p>

        <section class="bg-brand-500 text-bg p-lg rounded-md font-heading">
          <strong>bg-brand-500 · text-bg · p-lg · rounded-md</strong>
        </section>

        <div class="gap-md" style={{ display: "flex" }}>
          <button type="button" class="bg-brand-500 text-bg px-lg py-sm rounded-md">
            bg-brand-500
          </button>
          <button type="button" class="bg-brand-600 text-bg px-lg py-sm rounded-md">
            bg-brand-600
          </button>
          <button
            type="button"
            class="bg-bg text-text px-lg py-sm rounded-md border-text"
            style={{ borderWidth: "1px", borderStyle: "solid" }}
          >
            outlined
          </button>
        </div>

        <button
          type="button"
          onClick={flip}
          class="bg-brand-600 text-bg p-md rounded-md"
          style={{ cursor: "pointer", marginTop: "var(--space-md)" }}
        >
          {flipped
            ? "Restore brand color (var swap)"
            : "Flip --color-brand-500 (no recompile)"}
        </button>
      </div>
    </main>
  );
}

const host = document.getElementById("poc");
if (host) render(<Demo />, host);

// Start the engine after the theme + demo DOM exist so the first scan sees them.
await import("@tailwindcss/browser");
