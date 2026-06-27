import type { ComponentChildren } from "preact";

// The site shell: the thin frame around every page. One component, rendered in all three moments
// — the dev reader, the in-site editor (the editor layers its chrome over this, it does not
// replace it), and the publish prerender — so what you preview is what you publish, shell
// included (D21). Every value comes from theme.tokens via CSS variables.
//
// The header/navigation is NOT in the shell: it is a normal `<Navbar/>` component at the top of
// the page content, so it is editable, insertable and overridable like any other block (the nav
// is no longer hardcoded chrome). The shell only owns the content slot and a minimal footer.
//
// The content slot (`#nocms-content`) is rendered empty here and filled by a *separate* Preact
// root (the reader's content, or the editor's live canvas). Keeping content out of the shell's
// own tree is what lets the editor take the slot over in place without the shell re-rendering.
// The slot is full-bleed; sections own their own width via their Container, so the editor can
// simulate a breakpoint by narrowing the whole page (`#app`) and the page reflows with it,
// exactly as a real viewport would — never by reframing only the content column.
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
