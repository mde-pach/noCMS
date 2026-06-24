// The in-site editor: WYSIWYG over MDX, visual layout, and live token theming.
// It ships with each site and reuses the runtime renderer as its canvas. Heavy
// preview compilation loads only here, never in the reader's bundle.

import type { AuthConfig } from "@nocms/auth";
import type { ComponentRegistry } from "@nocms/components";
import type { RepoRef } from "@nocms/core";

export interface EditorOptions {
  repo: RepoRef;
  auth: AuthConfig;
  /** the component library available in the palette and the canvas */
  components: ComponentRegistry;
  /** DOM node the editor mounts into */
  target: Element;
}

export interface EditorHandle {
  dispose(): void;
}

export function mountEditor(_options: EditorOptions): EditorHandle {
  throw new Error("not implemented: mount the in-site editor");
}
