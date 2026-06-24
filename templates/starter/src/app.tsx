import type { ComponentChildren } from "preact";

// The page shell. Every value comes from theme.tokens via CSS variables, so
// editing a token restyles the site live with no rebuild.
export function App({ children }: { children: ComponentChildren }) {
  return (
    <main
      style={{
        maxWidth: "42rem",
        margin: "var(--space-lg) auto",
        padding: "0 var(--space-md)",
        color: "var(--color-text)",
        fontFamily: "var(--font-body)",
      }}
    >
      {children}
    </main>
  );
}
