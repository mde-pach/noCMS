import type { VNode } from "preact";
import { BoldIcon, ItalicIcon, LinkIcon } from "./icons.js";

export interface FormatBarProps {
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
}

const act = (fn: () => void) => (event: MouseEvent) => {
  // Keep focus in the prose view: a toolbar mousedown would otherwise blur the selection
  // before the command runs.
  event.preventDefault();
  event.stopPropagation();
  fn();
};

export function FormatBar({ onBold, onItalic, onLink }: FormatBarProps): VNode {
  return (
    <div class="nocms-toolbar" role="toolbar" aria-label="Text formatting">
      <button type="button" title="Bold" aria-label="Bold" onMouseDown={act(onBold)}>
        <BoldIcon size={13} />
      </button>
      <button
        type="button"
        title="Italic"
        aria-label="Italic"
        onMouseDown={act(onItalic)}
      >
        <ItalicIcon size={13} />
      </button>
      <button type="button" title="Link" aria-label="Link" onMouseDown={act(onLink)}>
        <LinkIcon size={13} />
      </button>
    </div>
  );
}
