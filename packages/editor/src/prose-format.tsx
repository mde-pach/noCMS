// The inspector panel for a selected prose block (a paragraph/heading/list/quote). It is the block's
// formatting surface: pick its kind — Paragraph, a Heading level, a bulleted/numbered list, or a
// quote — and the shell rewrites the block in the document. Below that, word-level formatting (bold,
// italic, code, link) acts on the live in-page selection while the block is being edited — so the
// page holds the caret and the panel is the toolbar acting on it.

import type { ProseMarkName } from "@nocms/prose";
import type { VNode } from "preact";
import {
  BoldIcon,
  BulletListIcon,
  CodeIcon,
  HeadingIcon,
  ItalicIcon,
  LinkIcon,
  NumberedListIcon,
  QuoteIcon,
} from "./icons.js";
import type { BlockKind } from "./prose-block.js";

interface BlockOption {
  kind: BlockKind;
  label: string;
  /** a short text glyph for the text levels; list/quote use an icon. */
  short?: string;
  icon?: VNode;
  /** clicking the already-active kind reverts to a paragraph (a toggle), for lists and quotes. */
  toggles?: boolean;
}

const BLOCKS: BlockOption[] = [
  { kind: "paragraph", label: "Paragraph", short: "¶" },
  { kind: "h1", label: "Heading 1", short: "H1" },
  { kind: "h2", label: "Heading 2", short: "H2" },
  { kind: "h3", label: "Heading 3", short: "H3" },
  { kind: "bulleted", label: "Bulleted list", icon: <BulletListIcon />, toggles: true },
  {
    kind: "numbered",
    label: "Numbered list",
    icon: <NumberedListIcon />,
    toggles: true,
  },
  { kind: "quote", label: "Quote", icon: <QuoteIcon />, toggles: true },
];

const MARKS: { name: ProseMarkName; label: string; icon: VNode }[] = [
  { name: "strong", label: "Bold", icon: <BoldIcon /> },
  { name: "em", label: "Italic", icon: <ItalicIcon /> },
  { name: "code", label: "Code", icon: <CodeIcon /> },
  { name: "link", label: "Link", icon: <LinkIcon /> },
];

const KIND_LABEL: Record<BlockKind, string> = {
  paragraph: "PARAGRAPH",
  h1: "HEADING 1",
  h2: "HEADING 2",
  h3: "HEADING 3",
  h4: "HEADING 4",
  h5: "HEADING 5",
  h6: "HEADING 6",
  bulleted: "BULLETED LIST",
  numbered: "NUMBERED LIST",
  quote: "QUOTE",
};

export interface ProseFormatProps {
  /** the selected block's current kind, used to mark the active option. */
  kind: BlockKind | undefined;
  /** reformat the selected block to `kind`. */
  onSetBlock: (kind: BlockKind) => void;
  /** true while the block's text is being edited in place — when word-level formatting applies. */
  editing: boolean;
  /** toggle an inline mark on the live in-page selection. */
  onMark: (name: ProseMarkName) => void;
}

export function ProseFormat({
  kind,
  onSetBlock,
  editing,
  onMark,
}: ProseFormatProps): VNode {
  const choose = (option: BlockOption): void => {
    onSetBlock(option.toggles && kind === option.kind ? "paragraph" : option.kind);
  };
  // mousedown, not click, with the default prevented: applying a mark must not blur the in-page
  // prose selection the way moving focus to the panel button otherwise would.
  const mark = (name: ProseMarkName) => (event: MouseEvent) => {
    event.preventDefault();
    onMark(name);
  };
  return (
    <div class="nocms-props">
      <div class="nc-block-head">
        <div class="nc-block-icon">
          <HeadingIcon />
        </div>
        <div style="flex:1">
          <div class="nocms-props-title nc-block-name">Text</div>
          <div class="nc-block-meta">{kind ? KIND_LABEL[kind] : "PROSE"} · PROSE</div>
        </div>
      </div>
      <div class="nc-rail-pad">
        <div class="nc-field">
          <span class="nc-mono nc-label">Format</span>
          <div class="nc-prose-blocks" role="group" aria-label="Block format">
            {BLOCKS.map((option) => (
              <button
                key={option.kind}
                type="button"
                class="nc-prose-block"
                title={option.label}
                aria-label={option.label}
                aria-pressed={kind === option.kind}
                onClick={() => choose(option)}
              >
                {option.icon ?? <span class="nc-prose-glyph">{option.short}</span>}
              </button>
            ))}
          </div>
        </div>
        <div class="nc-field">
          <span class="nc-mono nc-label">Text style</span>
          <div class="nc-prose-marks" role="group" aria-label="Inline formatting">
            {MARKS.map((m) => (
              <button
                key={m.name}
                type="button"
                class="nc-prose-mark"
                title={editing ? m.label : `${m.label} — select text on the page first`}
                aria-label={m.label}
                disabled={!editing}
                onMouseDown={mark(m.name)}
              >
                {m.icon}
              </button>
            ))}
          </div>
          {editing ? null : (
            <p class="nc-prose-hint">Select text on the page to format it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
