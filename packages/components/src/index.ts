// The curated component library composed in the editor and rendered by
// @nocms/renderer. Props are plain typed Preact props so @nocms/props-discovery
// derives controls automatically. Plugin packs contribute more via the sandbox.

import type { ComponentType } from "preact";
import type { GenericSchema } from "valibot";
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

type AnyComponent = ComponentType<Record<string, unknown>>;

/** A block in the editor's uniform tree (D15): a component plus, optionally, the
 *  valibot props schema its controls derive from (D9) and the named child slots
 *  it accepts (absent = a leaf block). Consumed by the renderer's ComponentMap
 *  and the editor's palette/props panel. */
export interface BlockDef {
  component: AnyComponent;
  /** valibot props schema → editor controls via `deriveControls`. */
  schema?: GenericSchema;
  /** named child regions this container accepts; absent = leaf. */
  slots?: string[];
  /** needs client-side hydration as an island? */
  island?: boolean;
}

export type ComponentRegistry = Record<string, BlockDef>;

const entry = (
  component: unknown,
  extra: Omit<BlockDef, "component"> = {},
): BlockDef => ({ component: component as AnyComponent, ...extra });
const island = (component: unknown): BlockDef => entry(component, { island: true });

export const registry: ComponentRegistry = {
  Hero: entry(Hero),
  Section: entry(Section, { schema: SectionSchema, slots: ["children"] }),
  Container: entry(Container),
  Grid: entry(Grid),
  Stack: entry(Stack, { schema: StackSchema, slots: ["children"] }),
  Card: entry(Card),
  Callout: entry(Callout),
  Image: entry(Image, { schema: ImageSchema }),
  Divider: entry(Divider),
  Badge: entry(Badge),
  Button: entry(Button, { schema: ButtonSchema }),
  Form: entry(Form),
  Input: entry(Input),
  Textarea: entry(Textarea),
  Select: entry(Select),
  Counter: island(Counter),
  LanguageSwitcher: island(LanguageSwitcher),
  LatestPosts: island(LatestPosts),
};

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
