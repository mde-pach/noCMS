// The curated component library composed in the editor and rendered by
// @nocms/renderer. Props are plain typed Preact props so @nocms/props-discovery
// derives controls automatically. Plugin packs contribute more via the sandbox.

import type { ComponentType } from "preact";
import { Badge } from "./primitives/Badge";
import { Button } from "./primitives/Button";
import { Callout } from "./primitives/Callout";
import { Card } from "./primitives/Card";
import { Container } from "./primitives/Container";
import { Divider } from "./primitives/Divider";
import { Form } from "./primitives/Form";
import { Grid } from "./primitives/Grid";
import { Hero } from "./primitives/Hero";
import { Image } from "./primitives/Image";
import { Input } from "./primitives/Input";
import { Section } from "./primitives/Section";
import { Select } from "./primitives/Select";
import { Stack } from "./primitives/Stack";
import { Textarea } from "./primitives/Textarea";

type AnyComponent = ComponentType<Record<string, unknown>>;

/** Consumed by the renderer's ComponentMap and the editor's palette. */
export type ComponentRegistry = Record<
  string,
  {
    component: AnyComponent;
    /** needs client-side hydration as an island? */
    island?: boolean;
  }
>;

const entry = (component: unknown) => ({ component: component as AnyComponent });

export const registry: ComponentRegistry = {
  Hero: entry(Hero),
  Section: entry(Section),
  Container: entry(Container),
  Grid: entry(Grid),
  Stack: entry(Stack),
  Card: entry(Card),
  Callout: entry(Callout),
  Image: entry(Image),
  Divider: entry(Divider),
  Badge: entry(Badge),
  Button: entry(Button),
  Form: entry(Form),
  Input: entry(Input),
  Textarea: entry(Textarea),
  Select: entry(Select),
};

export { Badge, type BadgeProps } from "./primitives/Badge";
export { Button, type ButtonProps } from "./primitives/Button";
export { Callout, type CalloutProps } from "./primitives/Callout";
export { Card, type CardProps } from "./primitives/Card";
export { Container, type ContainerProps } from "./primitives/Container";
export { Divider, type DividerProps } from "./primitives/Divider";
export { Form, type FormProps } from "./primitives/Form";
export { Grid, type GridProps } from "./primitives/Grid";
export { Hero, type HeroProps } from "./primitives/Hero";
export { Image, type ImageProps } from "./primitives/Image";
export { Input, type InputProps } from "./primitives/Input";
export { Section, type SectionProps } from "./primitives/Section";
export { Select, type SelectProps } from "./primitives/Select";
export { Stack, type StackProps } from "./primitives/Stack";
export { Textarea, type TextareaProps } from "./primitives/Textarea";
