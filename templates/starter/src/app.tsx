import type { ComponentChildren } from "preact";

// One shell for the dev reader, the in-site editor, and the publish prerender, so what you
// preview is what you publish. The navigation is a `<Navbar/>` at the top of the page content,
// not shell chrome, so it's editable like any other block. The content slot (`#nocms-content`) is
// filled by a *separate* Preact root, which is what lets the editor take it over in place; it's
// full-bleed, so a breakpoint narrows the whole page (`#app`) and everything reflows together.
export const CONTENT_SLOT_ID = "nocms-content";

export function SiteShell({
  children,
}: {
  children?: ComponentChildren;
  base?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <main id={CONTENT_SLOT_ID} style={{ flex: 1, width: "100%" }}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer
      style={{
        marginTop: "var(--space-xl)",
        padding: "var(--space-lg) var(--space-md)",
        borderTop: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)",
        fontSize: "0.85rem",
        opacity: 0.65,
        textAlign: "center",
      }}
    >
      Built with noCMS — the repo is the database, GitHub is the backend. Open source,
      MIT.
    </footer>
  );
}
