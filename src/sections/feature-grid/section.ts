import { z } from "zod";

export const schema = z.object({
  title: z.string().optional().meta({ field: "text", label: "Heading", inline: true }),
  items: z
    .array(
      z.object({
        title: z.string().meta({ field: "text", label: "Title" }),
        body: z.string().meta({ field: "text", label: "Description" }),
      }),
    )
    .default([])
    .meta({ field: "list", label: "Features", itemLabel: "title" }),
});

export const meta = {
  name: "Feature grid",
  category: "Content",
  description: "A responsive grid of short features.",
  defaults: {
    title: "What you get",
    items: [
      { title: "Yours to keep", body: "Plain files in your own repository." },
      { title: "No bill", body: "Free hosting, free tooling, no service." },
      { title: "Edit visually", body: "Click the thing and change it." },
    ],
  },
};
