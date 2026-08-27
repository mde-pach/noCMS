import { z } from "zod";

export const schema = z.object({
  brand: z.string().meta({ field: "text", label: "Site name", inline: true }),
});

export const meta = {
  role: "container",
  name: "Navigation",
  category: "Sections",
  description: "A site header that things can be dropped into.",
  defaults: { brand: "Your site" },
};
