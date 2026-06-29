import type { ComponentChildren } from "preact";

// One shell for the dev reader, the in-site editor, and the publish prerender, so what you
// preview is what you publish. Navigation and footer are `<Navbar/>` / `<Footer/>` blocks at the
// edges of the page *content*, not shell chrome — so they're selectable, draggable, and editable
// like any other block (one component model, no special-cased regions). The content slot
// (`#nocms-content`) is filled by a *separate* Preact root, which is what lets the editor take it
// over in place; it's full-bleed, so a breakpoint narrows the whole page (`#app`) and everything
// reflows together.
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
    </div>
  );
}
