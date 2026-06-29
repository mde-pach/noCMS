import * as v from "valibot";
import { cx } from "../cx";
import { Container } from "../primitives/Container";
import { Grid } from "../primitives/Grid";
import { FooterColumn, SEED_COLUMNS } from "./seeds";
import { hairlineTop, mutedInk, surfaceBg, surfaceField } from "./shared";

export const FooterSchema = v.object({
  siteName: v.optional(v.string(), "noCMS"),
  tagline: v.optional(v.string(), "Your website, in your repo."),
  columns: v.optional(v.array(FooterColumn), SEED_COLUMNS),
  copyright: v.optional(v.string(), "© noCMS. MIT licensed."),
  background: surfaceField("subtle"),
});

export type FooterProps = v.InferInput<typeof FooterSchema> & {
  class?: string;
  className?: string;
};

export function Footer({
  siteName = "noCMS",
  tagline = "Your website, in your repo.",
  columns = SEED_COLUMNS,
  copyright = "© noCMS. MIT licensed.",
  background = "subtle",
  class: cls,
  className,
}: FooterProps) {
  return (
    <footer class={cx(surfaceBg[background], "text-text py-xl", className, cls)}>
      <Container width="wide">
        <div class="grid gap-lg grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]">
          <div>
            <strong class="font-heading text-[1.2rem]">{siteName}</strong>
            {tagline ? <p class={cx("m-0 mt-sm", mutedInk)}>{tagline}</p> : null}
          </div>
          <Grid columns={Math.max(1, columns.length)} gap="md">
            {columns.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <div class="font-semibold mb-sm">{column.heading}</div>
                <ul class="list-none m-0 p-0 flex flex-col gap-sm">
                  {column.links?.map((link) => (
                    <li key={link.label}>
                      <a href={link.href} class={mutedInk}>
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
          <p class={cx("mt-lg pt-md text-[0.9rem]", hairlineTop, mutedInk)}>
            {copyright}
          </p>
        ) : null}
      </Container>
    </footer>
  );
}
