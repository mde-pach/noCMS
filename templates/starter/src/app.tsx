import type { ComponentChildren } from "preact";

// The dev reader's page chrome: a header + footer around the content. Every value comes from
// theme.tokens via CSS variables, so editing a token restyles it live with no rebuild. The
// published build emits only the content tree (no shell yet — D6), so this nav is a dev-time
// convenience; a real site composes its own nav as content.
export function App({ children }: { children: ComponentChildren }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteHeader />
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "60rem",
          margin: "0 auto",
          padding: "0 var(--space-md)",
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

function SiteHeader() {
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
        href="/"
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
