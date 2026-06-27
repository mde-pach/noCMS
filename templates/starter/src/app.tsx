import type { ComponentChildren } from "preact";

// The site shell: the header + footer that frame every page. One component, rendered in all
// three moments — the dev reader, the in-site editor (the editor layers its chrome over this,
// it does not replace it), and the publish prerender — so what you preview is what you publish,
// shell included (D21). Every value comes from theme.tokens via CSS variables, so editing a
// token restyles it live with no rebuild.
//
// The content slot (`#nocms-content`) is rendered empty here and filled by a *separate* Preact
// root (the reader's content, or the editor's live canvas). Keeping content out of the shell's
// own tree is what lets the editor take the slot over in place without the shell re-rendering.
// Its width follows `--nocms-content-width` so the editor can simulate breakpoints by narrowing
// the column, never by reframing the page.
export const CONTENT_SLOT_ID = "nocms-content";

export function SiteShell({
  children,
  base = "/",
}: {
  children?: ComponentChildren;
  base?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteHeader base={base} />
      <main
        id={CONTENT_SLOT_ID}
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "var(--nocms-content-width, 60rem)",
          margin: "0 auto",
          padding: "0 var(--space-md)",
          transition: "max-width .2s ease",
        }}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

const NAV = [
  { label: "Components", href: "#components" },
  { label: "Theming", href: "#theming" },
  { label: "Edit this page", href: "?edit" },
];

function SiteHeader({ base }: { base: string }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-md)",
        padding: "var(--space-sm) var(--space-md)",
        borderBottom:
          "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)",
        background: "color-mix(in srgb, var(--color-bg) 86%, transparent)",
        backdropFilter: "blur(8px)",
      }}
    >
      <a
        href={base}
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          gap: "0.4rem",
          textDecoration: "none",
          color: "var(--color-text)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.4rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          no<span style={{ color: "var(--color-brand-500)" }}>CMS</span>
        </span>
        <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>starter</span>
      </a>
      <nav style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
        {NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              fontSize: "0.9rem",
              textDecoration: "none",
              color: "var(--color-text)",
              opacity: 0.75,
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </header>
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
