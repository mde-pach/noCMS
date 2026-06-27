// The curated component library, declared as the `core` component pack and composed into
// a registry by the editor and renderer. Props are plain typed Preact props so controls
// derive automatically (D9). A site adds more with `createRegistry(core, myPack)` — plugin
// packs contribute via the sandbox without editing this package (D18).

import {
  type BlockDef,
  type ComponentPack,
  type ComponentRegistry,
  createRegistry,
  definePack,
} from "./packs";
import { Badge } from "./primitives/Badge";
import { Button, ButtonSchema } from "./primitives/Button";
import { Callout } from "./primitives/Callout";
import { Card } from "./primitives/Card";
import { Container } from "./primitives/Container";
import { Counter } from "./primitives/Counter";
import { Divider } from "./primitives/Divider";
import { Form } from "./primitives/Form";
import { Grid } from "./primitives/Grid";
import { Hero } from "./primitives/Hero";
import { Image, ImageSchema } from "./primitives/Image";
import { Input } from "./primitives/Input";
import { LanguageSwitcher } from "./primitives/LanguageSwitcher";
import { LatestPosts } from "./primitives/LatestPosts";
import { Section, SectionSchema } from "./primitives/Section";
import { Select } from "./primitives/Select";
import { Stack, StackSchema } from "./primitives/Stack";
import { Textarea } from "./primitives/Textarea";

const entry = (
  component: unknown,
  extra: Omit<BlockDef, "component"> = {},
): BlockDef => ({ component: component as BlockDef["component"], ...extra });

/** The curated component library: the always-present `core` pack a site composes with. */
export const core: ComponentPack = definePack({
  id: "core",
  name: "noCMS core",
  trust: "builtin",
  blocks: {
    Hero: entry(Hero, {
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
      category: "Layout",
      description: "Centers and width-constrains its contents.",
    }),
    Grid: entry(Grid, {
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
      category: "Content",
      description: "A bordered surface for a self-contained piece of content.",
    }),
    Callout: entry(Callout, {
      category: "Content",
      description: "Highlights a note, tip, or warning.",
    }),
    Image: entry(Image, {
      schema: ImageSchema,
      category: "Media",
      description: "A responsive image with alt text.",
    }),
    Divider: entry(Divider, {
      category: "Layout",
      description: "A horizontal rule between sections.",
    }),
    Badge: entry(Badge, {
      category: "Content",
      description: "A small inline label or status pill.",
    }),
    Button: entry(Button, {
      schema: ButtonSchema,
      category: "Content",
      description: "A call-to-action link styled as a button.",
    }),
    Form: entry(Form, { category: "Forms", description: "A form wrapper for inputs." }),
    Input: entry(Input, {
      category: "Forms",
      description: "A single-line text field.",
    }),
    Textarea: entry(Textarea, {
      category: "Forms",
      description: "A multi-line text field.",
    }),
    Select: entry(Select, {
      category: "Forms",
      description: "A dropdown of predefined options.",
    }),
    Counter: entry(Counter, {
      island: true,
      category: "Interactive",
      description: "A demo interactive counter (hydrated island).",
    }),
    LanguageSwitcher: entry(LanguageSwitcher, {
      island: true,
      category: "Interactive",
      description: "Switches the active site language.",
    }),
    LatestPosts: entry(LatestPosts, {
      island: true,
      category: "Interactive",
      description: "Lists the most recent collection entries.",
    }),
  },
});

/** The default registry: the core pack alone. Compose more with `createRegistry`. */
export const registry: ComponentRegistry = createRegistry(core);

export {
  type BlockDef,
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

export { Badge, type BadgeProps } from "./primitives/Badge";
export { Button, type ButtonProps, ButtonSchema } from "./primitives/Button";
export { Callout, type CalloutProps } from "./primitives/Callout";
export { Card, type CardProps } from "./primitives/Card";
export { Container, type ContainerProps } from "./primitives/Container";
export { Counter, type CounterProps } from "./primitives/Counter";
export { Divider, type DividerProps } from "./primitives/Divider";
export { Form, type FormProps } from "./primitives/Form";
export { Grid, type GridProps } from "./primitives/Grid";
export { Hero, type HeroProps } from "./primitives/Hero";
export { Image, type ImageProps, ImageSchema } from "./primitives/Image";
export { Input, type InputProps } from "./primitives/Input";
export {
  LanguageSwitcher,
  type LanguageSwitcherProps,
} from "./primitives/LanguageSwitcher";
export { LatestPosts, type LatestPostsProps } from "./primitives/LatestPosts";
export { Section, type SectionProps, SectionSchema } from "./primitives/Section";
export { Select, type SelectProps } from "./primitives/Select";
export { Stack, type StackProps, StackSchema } from "./primitives/Stack";
export { Textarea, type TextareaProps } from "./primitives/Textarea";
export { readSiteRuntime } from "./site-runtime";
