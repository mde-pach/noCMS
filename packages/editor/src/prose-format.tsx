// The inspector panel for a selected prose block (a paragraph/heading/list/quote). It is the block's
// formatting surface: pick its kind — Paragraph, a Heading level, a bulleted/numbered list, or a
// quote — and the shell rewrites the block in the document. Editing the *words* stays in place on the
// page (the prose session); this is the structural toolbar beside it.

import type { VNode } from "preact";
import { BulletListIcon, HeadingIcon, NumberedListIcon, QuoteIcon } from "./icons.js";
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

export interface ProseFormatProps {
  /** the selected block's current kind, used to mark the active option. */
  kind: BlockKind | undefined;
  /** reformat the selected block to `kind`. */
  onSetBlock: (kind: BlockKind) => void;
}

export function ProseFormat({ kind, onSetBlock }: ProseFormatProps): VNode {
  const choose = (option: BlockOption): void => {
    onSetBlock(option.toggles && kind === option.kind ? "paragraph" : option.kind);
  };
  return (
    <div class="nocms-props">
      <div class="nc-block-head">
        <div class="nc-block-icon">
          <HeadingIcon />
        </div>
        <div style="flex:1">
          <div class="nocms-props-title nc-block-name">Text</div>
          <div class="nc-block-meta">PARAGRAPH · PROSE</div>
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
      </div>
    </div>
  );
}
