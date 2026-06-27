// The component catalog: the flagship insert sheet. A centered modal over the dimmed
// canvas, search-first, with blocks grouped by intent into large cards — each a rendered
// mini-preview plus a quiet glyph, name, one-line description, and a library badge. It
// renders from serializable manifests alone (never live BlockDefs), so a builtin and a
// sandboxed plugin component are indistinguishable here (invariant #8). Single click
// inserts; hover reveals the Insert pill.

import type { ComponentManifest } from "@nocms/components";
import type { VNode } from "preact";
import { useMemo, useRef, useState } from "preact/hooks";
import { CloseIcon, ImageIcon, PlusIcon, SearchIcon, SectionIcon } from "./icons.js";

type PreviewKind =
  | "hero"
  | "cta"
  | "features"
  | "logos"
  | "testimonial"
  | "pricing"
  | "faq"
  | "contact"
  | "footer"
  | "generic";

function previewKind(m: ComponentManifest): PreviewKind {
  const hay = `${m.name} ${m.displayName} ${(m.tags ?? []).join(" ")}`.toLowerCase();
  if (/hero/.test(hay)) return "hero";
  if (/cta|call to action|banner/.test(hay)) return "cta";
  if (/feature|grid/.test(hay)) return "features";
  if (/logo/.test(hay)) return "logos";
  if (/testimonial|quote/.test(hay)) return "testimonial";
  if (/pricing|plan/.test(hay)) return "pricing";
  if (/faq|question/.test(hay)) return "faq";
  if (/contact|form|input/.test(hay)) return "contact";
  if (/footer/.test(hay)) return "footer";
  return "generic";
}

const bar = (w: string, c = "#D9D4CB", h = 4): VNode => (
  <div style={`width:${w};height:${h}px;border-radius:2px;background:${c}`} />
);

function MiniPreview({ kind }: { kind: PreviewKind }): VNode {
  switch (kind) {
    case "hero":
      return (
        <div style="text-align:center;width:100%">
          <div style="width:38px;height:4px;border-radius:2px;background:#D9B7A6;margin:0 auto 8px" />
          <div style="font-family:var(--nc-font-display);font-size:17px;font-weight:600;letter-spacing:-0.01em;line-height:1.1;color:#2A2824">
            Build something
            <br />
            you own.
          </div>
          <div style="display:flex;gap:5px;justify-content:center;margin-top:9px">
            <span style="width:30px;height:9px;border-radius:3px;border:1px solid #D5D1C8" />
            <span style="width:34px;height:9px;border-radius:3px;background:#B0542F" />
          </div>
        </div>
      );
    case "cta":
      return (
        <div style="text-align:center;width:90%;background:#1A1916;border-radius:8px;padding:16px 12px">
          <div style="font-family:var(--nc-font-display);font-size:14px;color:#fff;line-height:1.15">
            Ready to ship?
          </div>
          <div style="width:46px;height:9px;border-radius:3px;background:#B0542F;margin:8px auto 0" />
        </div>
      );
    case "features":
      return (
        <div style="display:flex;gap:8px;width:100%">
          {[0, 1, 2].map((n) => (
            <div
              key={n}
              style="flex:1;background:#fff;border:1px solid #EFEDE7;border-radius:6px;padding:9px"
            >
              <div style="width:13px;height:13px;border-radius:4px;background:#EEE7DF;margin-bottom:7px" />
              {bar("80%")}
              <div style="height:4px" />
              {bar("60%", "#E5E0D7")}
            </div>
          ))}
        </div>
      );
    case "logos":
      return (
        <div style="display:flex;gap:12px;align-items:center;justify-content:center;width:100%;opacity:0.6">
          {[0, 1, 2, 3, 4].map((n) => (
            <div
              key={n}
              style="width:34px;height:11px;border-radius:3px;background:#CFC9BF"
            />
          ))}
        </div>
      );
    case "testimonial":
      return (
        <div style="width:100%;text-align:center">
          <div style="font-family:var(--nc-font-display);font-size:30px;color:#D9B7A6;line-height:0.6">
            “
          </div>
          <div style="font-family:var(--nc-font-display);font-size:13px;font-style:italic;color:#3A3833;line-height:1.3;margin-top:2px">
            It just feels like
            <br />
            my own site.
          </div>
          <div style="width:54px;height:4px;border-radius:2px;background:#D9D4CB;margin:9px auto 0" />
        </div>
      );
    case "pricing":
      return (
        <div style="display:flex;gap:8px;width:100%;align-items:flex-end">
          <div style="flex:1;background:#fff;border:1px solid #EFEDE7;border-radius:6px;padding:8px;height:74px">
            {bar("60%")}
            <div style="height:6px" />
            <div style="font-family:var(--nc-font-display);font-size:13px;color:#2A2824">
              $0
            </div>
          </div>
          <div style="flex:1;background:#fff;border:1.5px solid #3D5A98;border-radius:6px;padding:8px;height:90px">
            {bar("60%", "#3D5A98")}
            <div style="height:6px" />
            <div style="font-family:var(--nc-font-display);font-size:13px;color:#2A2824">
              Pro
            </div>
          </div>
          <div style="flex:1;background:#fff;border:1px solid #EFEDE7;border-radius:6px;padding:8px;height:74px">
            {bar("60%")}
          </div>
        </div>
      );
    case "faq":
      return (
        <div style="width:100%;display:flex;flex-direction:column;gap:6px">
          {[0, 1, 2].map((n) => (
            <div
              key={n}
              style="display:flex;align-items:center;justify-content:space-between;background:#fff;border:1px solid #EFEDE7;border-radius:6px;padding:7px 9px"
            >
              {bar("60%")}
              <div style="width:7px;height:7px;border-right:1.5px solid #C0BBB1;border-bottom:1.5px solid #C0BBB1;transform:rotate(45deg)" />
            </div>
          ))}
        </div>
      );
    case "contact":
      return (
        <div style="width:78%;display:flex;flex-direction:column;gap:7px">
          <div style="height:13px;border:1px solid #E0DDD6;border-radius:5px;background:#fff" />
          <div style="height:13px;border:1px solid #E0DDD6;border-radius:5px;background:#fff" />
          <div style="height:24px;border:1px solid #E0DDD6;border-radius:5px;background:#fff" />
          <div style="width:50px;height:13px;border-radius:5px;background:#B0542F;align-self:flex-end" />
        </div>
      );
    case "footer":
      return (
        <div style="width:100%">
          <div style="display:flex;gap:14px;margin-bottom:9px">
            {[0, 1, 2].map((n) => (
              <div key={n} style="flex:1">
                {bar("50%", "#CFC9BF")}
                <div style="height:6px" />
                {bar("80%", "#E0DBD2", 3)}
                <div style="height:4px" />
                {bar("65%", "#E0DBD2", 3)}
              </div>
            ))}
          </div>
          <div style="height:1px;background:#E5E0D7;margin-bottom:6px" />
          {bar("40%", "#E0DBD2", 3)}
        </div>
      );
    default:
      return (
        <div style="width:82%;display:flex;flex-direction:column;gap:7px">
          {bar("70%", "#D9D4CB", 6)}
          {bar("100%", "#E5E0D7", 4)}
          {bar("90%", "#E5E0D7", 4)}
          {bar("55%", "#E5E0D7", 4)}
        </div>
      );
  }
}

function CardGlyph({ kind }: { kind: PreviewKind }): VNode {
  if (kind === "contact" || kind === "footer") return <ImageIcon size={13} />;
  return <SectionIcon size={13} />;
}

export interface CatalogCardProps {
  manifest: ComponentManifest;
  onInsert: (manifest: ComponentManifest) => void;
}

export function CatalogCard({ manifest, onInsert }: CatalogCardProps): VNode {
  const kind = previewKind(manifest);
  const saved = manifest.category === "Saved";
  return (
    <button
      type="button"
      class="nc-card nocms-catalog-card nocms-palette-item"
      title={manifest.description}
      onClick={() => onInsert(manifest)}
    >
      <div class="nc-card-preview">
        {manifest.preview ? (
          <div
            class="nocms-card-render"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: a snapshot of the component already rendered (and sanitized) on the canvas.
            dangerouslySetInnerHTML={{ __html: manifest.preview }}
          />
        ) : (
          <MiniPreview kind={kind} />
        )}
        <div class="nc-card-insert">
          <span>
            <PlusIcon size={12} /> Insert
          </span>
        </div>
      </div>
      <div class="nc-card-foot">
        <span class="nc-card-glyph">
          <CardGlyph kind={kind} />
        </span>
        <div class="nc-card-text">
          <div class="nc-card-name nocms-palette-name">{manifest.displayName}</div>
          {manifest.description ? (
            <div class="nc-card-desc">{manifest.description}</div>
          ) : null}
        </div>
        <span class={`nc-card-badge${saved ? " nc-pack" : ""}`}>
          {saved ? "Saved" : "Core"}
        </span>
      </div>
    </button>
  );
}

const CATEGORY_ORDER = [
  "Headers & heroes",
  "Sections",
  "Features",
  "Layout",
  "Social proof",
  "Content",
  "Media",
  "Pricing & plans",
  "Forms & footers",
  "Forms",
  "Other",
];

function matches(manifest: ComponentManifest, query: string): boolean {
  if (!query) return true;
  const haystack = [
    manifest.name,
    manifest.displayName,
    manifest.description ?? "",
    manifest.category,
    ...(manifest.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function groupByCategory(
  manifests: ComponentManifest[],
): [string, ComponentManifest[]][] {
  const groups = new Map<string, ComponentManifest[]>();
  for (const m of manifests) {
    const list = groups.get(m.category) ?? [];
    list.push(m);
    groups.set(m.category, list);
  }
  return [...groups.entries()].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a[0]);
    const ib = CATEGORY_ORDER.indexOf(b[0]);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

export interface InsertSheetProps {
  manifests: ComponentManifest[];
  onInsert: (manifest: ComponentManifest) => void;
  onClose: () => void;
}

export function InsertSheet({ manifests, onInsert, onClose }: InsertSheetProps): VNode {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(
    () => manifests.filter((m) => matches(m, query)),
    [manifests, query],
  );
  const groups = useMemo(() => groupByCategory(filtered), [filtered]);
  const searching = query.trim().length > 0;

  return (
    <div
      class="nc-scrim"
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
      <div class="nc-sheet" role="dialog" aria-label="Insert a section">
        <div class="nc-sheet-head">
          <div class="nc-sheet-titlerow">
            <div>
              <div class="nc-sheet-title">Insert a section</div>
              <div class="nc-sheet-sub">Curated blocks, grouped by what they do.</div>
            </div>
            <button
              type="button"
              class="nc-iconbtn"
              aria-label="Close"
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>

          <div class="nc-sheet-search">
            <span style="color:var(--nc-text-3);display:flex">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search sections by name, description, or tag…"
              value={query}
              onInput={(e) => setQuery(e.currentTarget.value)}
            />
            {searching ? (
              <span class="nc-sheet-count">
                {filtered.length} result{filtered.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          <div class="nc-chips">
            <span class="nc-chips-label">LIBRARY</span>
            <button type="button" class="nc-chip" aria-pressed="true">
              All
            </button>
            <button type="button" class="nc-chip">
              Core
            </button>
          </div>
        </div>

        <div class="nc-sheet-body">
          {filtered.length === 0 ? (
            <div class="nc-catalog-empty">
              <div class="nc-catalog-empty-glyph">
                <SearchIcon size={24} />
              </div>
              <div class="nc-catalog-empty-title">No sections match “{query}”</div>
              <div class="nc-catalog-empty-sub">
                Try a different term, or browse all sections by category.
              </div>
              <div class="nc-catalog-empty-actions">
                <button type="button" class="nc-btn-ghost" onClick={() => setQuery("")}>
                  Clear search
                </button>
                <button
                  type="button"
                  class="nc-btn-primary"
                  style="width:auto;padding:9px 16px"
                  onClick={() => setQuery("")}
                >
                  Browse all
                </button>
              </div>
            </div>
          ) : (
            groups.map(([category, items]) => (
              <div key={category}>
                <div class="nc-cat-header">{category}</div>
                <div class="nc-card-grid">
                  {items.map((m) => (
                    <CatalogCard key={m.name} manifest={m} onInsert={onInsert} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
