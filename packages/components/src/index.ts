import {
  block,
  type ComponentPack,
  type ComponentRegistry,
  createRegistry,
  definePack,
} from "./packs";
import { Badge, BadgeSchema } from "./primitives/Badge";
import { Button, ButtonSchema } from "./primitives/Button";
import { Callout, CalloutSchema } from "./primitives/Callout";
import { Card, CardSchema } from "./primitives/Card";
import { Container, ContainerSchema } from "./primitives/Container";
import { Counter, CounterSchema } from "./primitives/Counter";
import { Divider, DividerSchema } from "./primitives/Divider";
import { Frame, FrameSchema } from "./primitives/Frame";
import { Grid, GridSchema } from "./primitives/Grid";
import { Hero, HeroSchema } from "./primitives/Hero";
import { Image, ImageSchema } from "./primitives/Image";
import { Input, InputSchema } from "./primitives/Input";
import {
  LanguageSwitcher,
  LanguageSwitcherSchema,
} from "./primitives/LanguageSwitcher";
import { LatestPosts, LatestPostsSchema } from "./primitives/LatestPosts";
import { Section, SectionSchema } from "./primitives/Section";
import { Select, SelectSchema } from "./primitives/Select";
import { Stack, StackSchema } from "./primitives/Stack";
import { Textarea, TextareaSchema } from "./primitives/Textarea";
import { CTA, CTASchema } from "./sections/CTA";
import { Features, FeaturesSchema } from "./sections/Features";
import { Footer, FooterSchema } from "./sections/Footer";
import { HeroSection, HeroSectionSchema } from "./sections/HeroSection";
import { Navbar, NavbarSchema } from "./sections/Navbar";
import { Pricing, PricingSchema } from "./sections/Pricing";
import { Stats, StatsSchema } from "./sections/Stats";
import { Testimonials, TestimonialsSchema } from "./sections/Testimonials";

const entry = block;

export const core: ComponentPack = definePack({
  id: "core",
  name: "noCMS core",
  trust: "builtin",
  blocks: {
    Hero: entry(Hero, {
      schema: HeroSchema,
      slots: ["children"],
      category: "Content",
      description: "Large page-opening banner with a title and slot for actions.",
    }),
    Section: entry(Section, {
      schema: SectionSchema,
      slots: ["children"],
      category: "Layout",
      description: "A full-width band that groups content vertically.",
    }),
    Container: entry(Container, {
      schema: ContainerSchema,
      slots: ["children"],
      category: "Layout",
      description: "Centers and width-constrains its contents.",
    }),
    Frame: entry(Frame, {
      schema: FrameSchema,
      slots: ["children"],
      category: "Layout",
      description: "Auto-layout container: arrange children as a row, column, or grid.",
    }),
    Grid: entry(Grid, {
      schema: GridSchema,
      slots: ["children"],
      category: "Layout",
      description: "Arranges children in responsive columns.",
    }),
    Stack: entry(Stack, {
      schema: StackSchema,
      slots: ["children"],
      category: "Layout",
      description: "Stacks children with consistent spacing.",
    }),
    Card: entry(Card, {
      schema: CardSchema,
      slots: ["children"],
      category: "Content",
      description: "A bordered surface for a self-contained piece of content.",
    }),
    Callout: entry(Callout, {
      schema: CalloutSchema,
      slots: ["children"],
      category: "Content",
      description: "Highlights a note, tip, or warning.",
    }),
    Image: entry(Image, {
      schema: ImageSchema,
      category: "Media",
      description: "A responsive image with alt text.",
    }),
    Divider: entry(Divider, {
      schema: DividerSchema,
      category: "Layout",
      description: "A horizontal rule between sections.",
    }),
    Badge: entry(Badge, {
      schema: BadgeSchema,
      category: "Content",
      description: "A small inline label or status pill.",
    }),
    Button: entry(Button, {
      schema: ButtonSchema,
      category: "Content",
      description: "A call-to-action link styled as a button.",
    }),
    Input: entry(Input, {
      schema: InputSchema,
      category: "Fields",
      description: "A single-line text field.",
    }),
    Textarea: entry(Textarea, {
      schema: TextareaSchema,
      category: "Fields",
      description: "A multi-line text field.",
    }),
    Select: entry(Select, {
      schema: SelectSchema,
      category: "Fields",
      description: "A dropdown of predefined options.",
    }),
    Counter: entry(Counter, {
      schema: CounterSchema,
      island: true,
      category: "Interactive",
      description: "A demo interactive counter (hydrated island).",
    }),
    LanguageSwitcher: entry(LanguageSwitcher, {
      schema: LanguageSwitcherSchema,
      island: true,
      category: "Interactive",
      description: "Switches the active site language.",
    }),
    LatestPosts: entry(LatestPosts, {
      schema: LatestPostsSchema,
      island: true,
      category: "Interactive",
      description: "Lists the most recent collection entries.",
    }),

    Navbar: entry(Navbar, {
      schema: NavbarSchema,
      category: "Sections",
      description:
        "Site header with a wordmark, navigation links, and an optional CTA.",
    }),
    HeroSection: entry(HeroSection, {
      schema: HeroSectionSchema,
      displayName: "Hero Section",
      category: "Sections",
      description:
        "A page-opening hero with headline, copy, and call-to-action buttons.",
    }),
    Features: entry(Features, {
      schema: FeaturesSchema,
      category: "Sections",
      description: "A grid of feature cards, each with an icon, heading, and copy.",
    }),
    Pricing: entry(Pricing, {
      schema: PricingSchema,
      category: "Sections",
      description:
        "Side-by-side pricing tiers with a feature checklist and a highlight.",
    }),
    Testimonials: entry(Testimonials, {
      schema: TestimonialsSchema,
      category: "Sections",
      description: "Customer quotes with attribution and optional avatars.",
    }),
    Stats: entry(Stats, {
      schema: StatsSchema,
      category: "Sections",
      description: "A row of headline metrics on a brand band.",
    }),
    CTA: entry(CTA, {
      schema: CTASchema,
      displayName: "Call to action",
      category: "Sections",
      description: "A closing call-to-action, as a full band or an inset box.",
    }),
    Footer: entry(Footer, {
      schema: FooterSchema,
      category: "Sections",
      description: "Site footer with a brand blurb, link columns, and copyright.",
    }),
  },
});

export const registry: ComponentRegistry = createRegistry(core);

export {
  type BlockDef,
  block,
  type ComponentManifest,
  type ComponentPack,
  type ComponentRegistry,
  controlsOf,
  createRegistry,
  definePack,
  manifestOf,
  type PropPrimitive,
  registryManifest,
} from "./packs";
export { Badge, type BadgeProps, BadgeSchema } from "./primitives/Badge";
export { Button, type ButtonProps, ButtonSchema } from "./primitives/Button";
export { Callout, type CalloutProps, CalloutSchema } from "./primitives/Callout";
export { Card, type CardProps, CardSchema } from "./primitives/Card";
export {
  Container,
  type ContainerProps,
  ContainerSchema,
} from "./primitives/Container";
export { Counter, type CounterProps, CounterSchema } from "./primitives/Counter";
export { Divider, type DividerProps, DividerSchema } from "./primitives/Divider";
export { Frame, type FrameProps, FrameSchema } from "./primitives/Frame";
export { Grid, type GridProps, GridSchema } from "./primitives/Grid";
export { Hero, type HeroProps, HeroSchema } from "./primitives/Hero";
export { Image, type ImageProps, ImageSchema } from "./primitives/Image";
export { Input, type InputProps, InputSchema } from "./primitives/Input";
export {
  LanguageSwitcher,
  type LanguageSwitcherProps,
  LanguageSwitcherSchema,
} from "./primitives/LanguageSwitcher";
export {
  LatestPosts,
  type LatestPostsProps,
  LatestPostsSchema,
} from "./primitives/LatestPosts";
export { Section, type SectionProps, SectionSchema } from "./primitives/Section";
export { Select, type SelectProps, SelectSchema } from "./primitives/Select";
export { Stack, type StackProps, StackSchema } from "./primitives/Stack";
export { Textarea, type TextareaProps, TextareaSchema } from "./primitives/Textarea";
export {
  type ComposedComponentDef,
  composedBlockFromDefinition,
  defineSavedComponent,
  type PropSlot,
  type SavedComponentDef,
  type SavedDef,
  type StructureNode,
  savedBlockFromDefinition,
  savedDefToBlock,
  savedPack,
} from "./saved";
export { CTA, type CTAProps, CTASchema } from "./sections/CTA";
export { Features, type FeaturesProps, FeaturesSchema } from "./sections/Features";
export { Footer, type FooterProps, FooterSchema } from "./sections/Footer";
export {
  HeroSection,
  type HeroSectionProps,
  HeroSectionSchema,
} from "./sections/HeroSection";
export { Navbar, type NavbarProps, NavbarSchema } from "./sections/Navbar";
export { Pricing, type PricingProps, PricingSchema } from "./sections/Pricing";
export { Stats, type StatsProps, StatsSchema } from "./sections/Stats";
export {
  Testimonials,
  type TestimonialsProps,
  TestimonialsSchema,
} from "./sections/Testimonials";
export { readSiteRuntime } from "./site-runtime";
