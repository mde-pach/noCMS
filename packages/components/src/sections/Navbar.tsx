import * as v from "valibot";
import { Button } from "../primitives/Button";
import { linkField } from "./shared";

const NavLink = v.object({
  label: v.string(),
  href: v.pipe(v.string(), v.metadata({ control: "url" })),
});

const SEED_LINKS: v.InferInput<typeof NavLink>[] = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "Edit this page", href: "?edit" },
];

// `brand`/`brandMark` render as "brand<accent>brandMark</accent>" so the wordmark keeps its
// two-tone look while staying plain editable text. The links are an array, so the editor's list
// control adds/reorders/edits them — the nav is a normal component, not hardcoded chrome.
export const NavbarSchema = v.object({
  brand: v.optional(v.string(), "no"),
  brandMark: v.optional(v.string(), "CMS"),
  tagline: v.optional(v.string(), "starter"),
  links: v.optional(v.array(NavLink), SEED_LINKS),
  ctaLabel: v.optional(v.string()),
  ctaHref: linkField(),
  sticky: v.optional(v.boolean(), true),
});

export type NavbarProps = v.InferInput<typeof NavbarSchema>;

// The site header: a wordmark, a row of links, and an optional call-to-action. A normal curated
// component — schema-driven controls, overridable by a site pack, insertable from the catalog —
// so the navigation is customised and extended exactly like the rest of the site.
export function Navbar({
  brand = "no",
  brandMark = "CMS",
  tagline = "starter",
  links = SEED_LINKS,
  ctaLabel,
  ctaHref = "#",
  sticky = true,
}: NavbarProps) {
  return (
    <header
      class="navbar"
      style={{
        position: sticky ? "sticky" : "static",
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
          {brand}
          <span style={{ color: "var(--color-brand-500)" }}>{brandMark}</span>
        </span>
        {tagline ? (
          <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>{tagline}</span>
        ) : null}
      </a>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-md)",
          flexWrap: "wrap",
        }}
      >
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            style={{
              fontSize: "0.9rem",
              textDecoration: "none",
              color: "var(--color-text)",
              opacity: 0.75,
            }}
          >
            {link.label}
          </a>
        ))}
        {ctaLabel ? <Button label={ctaLabel} href={ctaHref} variant="primary" /> : null}
      </nav>
    </header>
  );
}
