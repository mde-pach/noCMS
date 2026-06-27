// The page-properties rail: the default state of the right dock when nothing is selected.
// Title + description edit the page frontmatter; the Design & brand row expands into the
// token panel (rendered by the shell and passed in); "Add a section" opens the catalog.
// Selecting a block swaps this for the schema-driven block panel (props-panel.tsx).

import type { VNode } from "preact";
import { ChevronDown, ChevronRight, PageIcon, PlusIcon } from "./icons.js";

export interface PageRailProps {
  pageName: string;
  route: string;
  title: string;
  description: string;
  onTitle: (value: string) => void;
  onDescription: (value: string) => void;
  brandExpanded: boolean;
  onToggleBrand: () => void;
  /** the design & brand panel body, rendered by the shell from TokensPanel. */
  brandPanel: VNode | null;
  onAddSection: () => void;
}

export function PageRail({
  pageName,
  route,
  title,
  description,
  onTitle,
  onDescription,
  brandExpanded,
  onToggleBrand,
  brandPanel,
  onAddSection,
}: PageRailProps): VNode {
  return (
    <div class="nc-rail-pad">
      <div class="nc-rail-head">
        <div>
          <div class="nc-rail-title">{pageName}</div>
          <div class="nc-rail-sub">Page · {route}</div>
        </div>
        <div class="nc-iconbtn" aria-hidden="true">
          <PageIcon />
        </div>
      </div>

      <div class="nc-field">
        <label class="nc-mono nc-label" for="nc-page-title">
          Title
        </label>
        <input
          id="nc-page-title"
          name="page.title"
          class="nc-input"
          value={title}
          onInput={(e) => onTitle(e.currentTarget.value)}
        />
      </div>

      <div class="nc-field">
        <label class="nc-mono nc-label" for="nc-page-desc">
          Description
        </label>
        <textarea
          id="nc-page-desc"
          name="page.description"
          class="nc-textarea"
          value={description}
          onInput={(e) => onDescription(e.currentTarget.value)}
        />
      </div>

      <hr class="nc-divider" />

      {brandExpanded ? (
        <div class="nc-brand-panel">
          <button
            type="button"
            class="nc-brand-panel-head"
            onClick={onToggleBrand}
            style="width:100%;border:0;font:inherit;text-align:left"
          >
            <div>
              <div class="nc-brand-entry-title">Design &amp; brand</div>
              <div class="nc-brand-entry-sub">Tokens that restyle the whole site</div>
            </div>
            <ChevronDown size={13} />
          </button>
          <div class="nc-brand-panel-body">{brandPanel}</div>
        </div>
      ) : (
        <button type="button" class="nc-brand-entry" onClick={onToggleBrand}>
          <div class="nc-brand-entry-left">
            <div class="nc-brand-swatches">
              <span style="background:#B0542F" />
              <span style="background:#3D5A98" />
              <span style="background:#1A1916" />
            </div>
            <div>
              <div class="nc-brand-entry-title">Design &amp; brand</div>
              <div class="nc-brand-entry-sub">Tokens that restyle the whole site</div>
            </div>
          </div>
          <ChevronRight size={13} />
        </button>
      )}

      <button
        type="button"
        class="nc-btn-primary"
        style="margin-top:20px"
        onClick={onAddSection}
      >
        <PlusIcon size={14} />
        Add a section
      </button>
    </div>
  );
}
