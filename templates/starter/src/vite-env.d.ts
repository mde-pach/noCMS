/// <reference types="vite/client" />

declare module "*.mdx" {
  import type { ComponentType } from "preact";

  const Content: ComponentType;
  export default Content;
}
