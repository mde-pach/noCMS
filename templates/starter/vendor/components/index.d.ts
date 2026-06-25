import type { ComponentType } from "preact";
import type { GenericSchema } from "valibot";
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
export declare const registry: ComponentRegistry;
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
export { LanguageSwitcher, type LanguageSwitcherProps, } from "./primitives/LanguageSwitcher";
export { LatestPosts, type LatestPostsProps } from "./primitives/LatestPosts";
export { Section, type SectionProps, SectionSchema } from "./primitives/Section";
export { Select, type SelectProps } from "./primitives/Select";
export { Stack, type StackProps, StackSchema } from "./primitives/Stack";
export { Textarea, type TextareaProps } from "./primitives/Textarea";
export { readSiteRuntime } from "./site-runtime";
