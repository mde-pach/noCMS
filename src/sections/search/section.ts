import { z } from "zod";

export const schema = z.object({
  label: z.string().default("Search").meta({ field: "text", label: "Label" }),
});

export const meta = {
  role: "block",
  name: "Search",
  category: "Content",
  description: "Search this site. Runs in the visitor's browser, no server.",
  defaults: { label: "Search" },
};
