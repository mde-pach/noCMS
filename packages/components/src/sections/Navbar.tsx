import * as v from "valibot";
import { cx } from "../cx";
import { Button } from "../primitives/Button";
import { NavLink, SEED_LINKS } from "./seeds";
import { linkField } from "./shared";

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

export type NavbarProps = v.InferInput<typeof NavbarSchema> & {
  class?: string;
  className?: string;
};

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
  class: cls,
  className,
}: NavbarProps) {
  return (
    <header
      class={cx(
        sticky ? "sticky" : "static",
        "top-0 z-10 flex items-center justify-between gap-md py-sm px-md border-b border-b-text/10 bg-bg/86 backdrop-blur-[8px]",
        className,
        cls,
      )}
    >
      <a
        href="/"
        class="inline-flex items-baseline gap-[0.4rem] no-underline text-text"
      >
        <span class="font-heading text-[1.4rem] font-semibold tracking-[-0.02em]">
          {brand}
          <span class="text-brand-500">{brandMark}</span>
        </span>
        {tagline ? <span class="text-[0.75rem] opacity-60">{tagline}</span> : null}
      </a>
      <nav class="flex items-center gap-md flex-wrap">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            class="text-[0.9rem] no-underline text-text opacity-75"
          >
            {link.label}
          </a>
        ))}
        {ctaLabel ? <Button label={ctaLabel} href={ctaHref} variant="primary" /> : null}
      </nav>
    </header>
  );
}
