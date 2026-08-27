import { z } from "zod";

export const schema = z.object({
  title: z.string().meta({ field: "text", label: "Message", inline: true }),
  label: z.string().meta({ field: "text", label: "Button text" }),
  href: z.string().meta({ field: "link", label: "Button link" }),
});

export const meta = {
  role: "block",
  name: "Call to action",
  category: "Content",
  description: "A closing prompt with a button.",
  defaults: { title: "Ready to start?", label: "Get going", href: "/" },
};
