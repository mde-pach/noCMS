import * as v from "valibot";
import { imageField, linkField, richText, urlProp } from "../schema-builders";

export const NavLink = v.object({
  label: v.string(),
  href: urlProp(),
});

export const SEED_LINKS: v.InferInput<typeof NavLink>[] = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "Edit this page", href: "?edit" },
];

export const FeatureItem = v.object({
  icon: v.optional(v.string()),
  title: v.string(),
  body: v.optional(v.string()),
});

export const SEED_ITEMS: v.InferInput<typeof FeatureItem>[] = [
  {
    icon: "◆",
    title: "The repo is the database",
    body: "Content, history, and drafts live in git. No backend to run, nothing to pay for.",
  },
  {
    icon: "✎",
    title: "Edit in-site, publish on click",
    body: "A WYSIWYG editor ships with every site. Preview is exactly what publishes.",
  },
  {
    icon: "✦",
    title: "Theme without a rebuild",
    body: "Tokens are runtime CSS variables — restyle live, never wait on a build.",
  },
];

export const FooterLink = v.object({
  label: v.string(),
  href: urlProp(),
});

export const FooterColumn = v.object({
  heading: v.string(),
  links: v.optional(v.array(FooterLink)),
});

export const SEED_COLUMNS: v.InferInput<typeof FooterColumn>[] = [
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

export const Quote = v.object({
  quote: richText(),
  name: v.string(),
  role: v.optional(v.string()),
  avatar: imageField(),
});

export const SEED_QUOTES: v.InferInput<typeof Quote>[] = [
  {
    quote: "I shipped my portfolio in an afternoon and I own every byte of it.",
    name: "Ada L.",
    role: "Designer",
  },
  {
    quote:
      "No dashboard to log into, no bill at the end of the month. It's just my repo.",
    name: "Grace H.",
    role: "Indie dev",
  },
  {
    quote: "Editing in-site and seeing the exact published result is the whole game.",
    name: "Linus T.",
    role: "Writer",
  },
];

export const Tier = v.object({
  name: v.string(),
  price: v.string(),
  period: v.optional(v.string()),
  features: v.optional(v.array(v.string())),
  ctaLabel: v.optional(v.string(), "Choose plan"),
  ctaHref: linkField(),
  highlighted: v.optional(v.boolean(), false),
});

export const SEED_TIERS: v.InferInput<typeof Tier>[] = [
  {
    name: "Hobby",
    price: "Free",
    period: "forever",
    features: ["1 site", "Community support", "GitHub Pages hosting"],
    ctaLabel: "Start free",
  },
  {
    name: "Pro",
    price: "$0",
    period: "still free",
    features: ["Unlimited sites", "Custom domain", "Live theming", "Priority docs"],
    ctaLabel: "Fork the starter",
    highlighted: true,
  },
  {
    name: "Team",
    price: "$0",
    period: "open source",
    features: ["Everything in Pro", "Self-host the relay", "Plugin sandbox"],
    ctaLabel: "Read the guide",
  },
];

export const Stat = v.object({
  value: v.string(),
  label: v.string(),
});

export const SEED_STATS: v.InferInput<typeof Stat>[] = [
  { value: "$0", label: "Monthly cost" },
  { value: "100%", label: "Yours to own" },
  { value: "1-click", label: "To publish" },
];

export const SEED_HERO = {
  title: "Build a real website on GitHub — for free",
  subtitle:
    "noCMS turns your repo into a CMS. Edit in-site, theme live, publish with one click. Nothing centralized to maintain.",
  primaryLabel: "Get started",
  secondaryLabel: "See how it works",
} as const;

export const SEED_CTA = {
  title: "Ready to own your website?",
  body: "Fork the starter, sign in, and start editing. It's free and it stays yours.",
  primaryLabel: "Fork the starter",
} as const;
