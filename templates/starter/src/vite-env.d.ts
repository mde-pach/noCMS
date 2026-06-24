/// <reference types="vite/client" />

declare module "*.mdx" {
  import type { ComponentType } from "preact";

  const Content: ComponentType<{ components?: Record<string, ComponentType> }>;
  export default Content;
}
