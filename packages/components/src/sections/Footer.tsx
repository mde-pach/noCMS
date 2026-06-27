import * as v from "valibot";
import { Container } from "../primitives/Container";
import { Grid } from "../primitives/Grid";
import { hairline, mutedInk, surfaceField, surfaceFor } from "./shared";

const FooterLink = v.object({
  label: v.string(),
  href: v.pipe(v.string(), v.metadata({ control: "url" })),
});

const FooterColumn = v.object({
  heading: v.string(),
  links: v.optional(v.array(FooterLink)),
});

const SEED_COLUMNS: v.InferInput<typeof FooterColumn>[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Docs", href: "#docs" },
      { label: "GitHub", href: "https://github.com" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "License", href: "#license" },
      { label: "Privacy", href: "#privacy" },
    ],
  },
];

export const FooterSchema = v.object({
  siteName: v.optional(v.string(), "noCMS"),
  tagline: v.optional(v.string(), "Your website, in your repo."),
  columns: v.optional(v.array(FooterColumn), SEED_COLUMNS),
  copyright: v.optional(v.string(), "© noCMS. MIT licensed."),
  background: surfaceField("subtle"),
});

export type FooterProps = v.InferInput<typeof FooterSchema>;

export function Footer({
  siteName = "noCMS",
  tagline = "Your website, in your repo.",
  columns = SEED_COLUMNS,
  copyright = "© noCMS. MIT licensed.",
  background = "subtle",
}: FooterProps) {
  return (
    <footer
      class="footer"
      style={{
        background: surfaceFor[background],
        color: "var(--color-text)",
        paddingBlock: "var(--space-xl)",
      }}
    >
      <Container width="wide">
        <div
          style={{
            display: "grid",
            gap: "var(--space-lg)",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))",
          }}
        >
          <div>
            <strong style={{ fontFamily: "var(--font-heading)", fontSize: "1.2rem" }}>
              {siteName}
            </strong>
            {tagline ? (
              <p style={{ margin: "var(--space-sm) 0 0", color: mutedInk }}>
                {tagline}
              </p>
            ) : null}
          </div>
          <Grid columns={Math.max(1, columns.length)} gap="md">
            {columns.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <div style={{ fontWeight: 600, marginBottom: "var(--space-sm)" }}>
                  {column.heading}
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-sm)",
                  }}
                >
                  {column.links?.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} style={{ color: mutedInk }}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </Grid>
        </div>
        {copyright ? (
          <p
            style={{
              marginTop: "var(--space-lg)",
              paddingTop: "var(--space-md)",
              borderTop: hairline,
              color: mutedInk,
              fontSize: "0.9rem",
            }}
          >
            {copyright}
          </p>
        ) : null}
      </Container>
    </footer>
  );
}
