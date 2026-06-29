// The modal layer as one presenter: given which overlay is open, it renders the right dialog
// (insert catalog, page navigator, media picker, save-as-component). It's a pure view — the shell
// owns which overlay is open and what each action does, and passes the data + callbacks in. The
// publish popover stays in the shell because it renders into a different host (a corner popover,
// not the centred modal).

import type { ComponentManifest } from "@nocms/components";
import type { ControlDescriptor } from "@nocms/controls";
import type { VNode } from "preact";
import { InsertSheet } from "./catalog.js";
import type { PropValue } from "./jsx-attributes.js";
import { MediaPicker } from "./media.js";
import { Navigator, type NavSection } from "./navigator.js";
import { SaveComponentDialog } from "./save-component.js";

export type OverlayKind =
  | "catalog"
  | "publish"
  | "navigator"
  | "media"
  | "save-component";

/** Placeholder media library (no asset backend yet). */
export const MEDIA_ITEMS = [
  {
    url: "https://placehold.co/400x300/B0542F/ffffff?text=hero",
    name: "hero-cover.jpg",
  },
  { url: "https://placehold.co/400x300/5B6B4A/ffffff?text=team", name: "team.jpg" },
  { url: "https://placehold.co/400x300/3D5A98/ffffff?text=office", name: "office.jpg" },
  {
    url: "https://placehold.co/400x300/BC9A4A/ffffff?text=product",
    name: "product.jpg",
  },
  { url: "https://placehold.co/400x300/1A1916/ffffff?text=banner", name: "banner.jpg" },
];

/** Placeholder page list (single-page sites for now). */
const PAGES = ["Home", "About", "Work", "Journal", "Contact"];

/** Everything the save-as-component dialog needs, computed by the shell from the selection. */
export interface SaveDialogData {
  base: string;
  controls: ControlDescriptor[];
  values: Record<string, PropValue>;
  previewHtml?: string;
  container: boolean;
}

export interface ModalProps {
  overlay: OverlayKind | null;
  pageName: string;
  manifests: ComponentManifest[];
  sections: NavSection[];
  saveDialog: SaveDialogData | null;
  onInsert: (manifest: ComponentManifest) => void;
  onSelectSection: (index: number) => void;
  onPickMedia: (url: string) => void;
  onSaveComponent: (name: string, exposed: string[], slot: boolean) => void;
  onClose: () => void;
}

export function Modal(props: ModalProps): VNode | null {
  const { overlay, onClose } = props;
  if (overlay === "catalog") {
    return (
      <InsertSheet
        manifests={props.manifests}
        onInsert={props.onInsert}
        onClose={onClose}
      />
    );
  }
  if (overlay === "navigator") {
    return (
      <Navigator
        pageName={props.pageName}
        pages={PAGES}
        sections={props.sections}
        onSelectSection={props.onSelectSection}
        onClose={onClose}
      />
    );
  }
  if (overlay === "media") {
    return (
      <MediaPicker items={MEDIA_ITEMS} onInsert={props.onPickMedia} onClose={onClose} />
    );
  }
  if (overlay === "save-component" && props.saveDialog) {
    const d = props.saveDialog;
    return (
      <SaveComponentDialog
        base={d.base}
        controls={d.controls}
        values={d.values}
        previewHtml={d.previewHtml}
        container={d.container}
        onSave={props.onSaveComponent}
        onClose={onClose}
      />
    );
  }
  return null;
}
