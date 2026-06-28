import type { VNode } from "preact";
import { GripIcon, PageIcon, PlusIcon, SectionIcon } from "./icons.js";

export interface NavSection {
  label: string;
  index: number;
  selected: boolean;
}

export interface NavigatorProps {
  pageName: string;
  pages: string[];
  sections: NavSection[];
  onSelectSection: (index: number) => void;
  onClose: () => void;
}

export function Navigator({
  pageName,
  pages,
  sections,
  onSelectSection,
  onClose,
}: NavigatorProps): VNode {
  return (
    <div
      class="nc-nav-scrim"
      role="button"
      tabIndex={-1}
      aria-label="Close"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div class="nc-navigator" role="dialog" aria-label="Pages and structure">
        <div class="nc-nav-section-label">
          <span>Pages</span>
          <PlusIcon size={13} />
        </div>
        {pages.map((p) => (
          <div key={p} class="nc-nav-row" aria-current={p === pageName}>
            <span class="nc-grip" aria-hidden="true">
              <GripIcon />
            </span>
            <PageIcon size={14} />
            <span style="flex:1">{p}</span>
          </div>
        ))}

        <div class="nc-nav-section-label">
          <span>Sections · {pageName}</span>
        </div>
        {sections.map((s) => (
          <button
            key={`${s.index}-${s.label}`}
            type="button"
            class="nc-nav-row"
            style="width:100%;border:0;background:none;font:inherit;text-align:left"
            aria-current={s.selected}
            onClick={() => onSelectSection(s.index)}
          >
            <span class="nc-grip" aria-hidden="true">
              <GripIcon />
            </span>
            <SectionIcon size={14} />
            <span style="flex:1">{s.label}</span>
          </button>
        ))}
        {sections.length === 0 ? (
          <p class="nocms-empty" style="padding:8px 4px">
            No sections yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
