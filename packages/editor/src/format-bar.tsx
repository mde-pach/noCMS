import type { VNode } from "preact";
import { BoldIcon, ItalicIcon, LinkIcon } from "./icons.js";

export interface FormatBarProps {
  /** the edited block's name, shown as a leading label so the bar reads as the same chrome the
   *  selection chip did — one pill, not a chip stacked under a toolbar. */
  label?: string;
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

export function FormatBar({ label, onBold, onItalic, onLink }: FormatBarProps): VNode {
  return (
    <div
      class="nocms-toolbar nocms-toolbar--float"
      role="toolbar"
      aria-label="Text formatting"
    >
      {label ? (
        <>
          <span class="nc-tool-label">{label}</span>
          <span class="nc-tool-sep" />
        </>
      ) : null}
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
