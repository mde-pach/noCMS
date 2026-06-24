import type { ComponentType } from "preact";
type AnyComponent = ComponentType<Record<string, unknown>>;
/** Consumed by the renderer's ComponentMap and the editor's palette. */
export type ComponentRegistry = Record<string, {
    component: AnyComponent;
    /** needs client-side hydration as an island? */
    island?: boolean;
}>;
export declare const registry: ComponentRegistry;
export { Badge, type BadgeProps } from "./primitives/Badge";
export { Button, type ButtonProps } from "./primitives/Button";
export { Callout, type CalloutProps } from "./primitives/Callout";
export { Card, type CardProps } from "./primitives/Card";
export { Container, type ContainerProps } from "./primitives/Container";
export { Counter, type CounterProps } from "./primitives/Counter";
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
