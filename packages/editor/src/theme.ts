// The editor chrome stylesheet: one source of truth for the design tokens (colors,
// type families, radii, shadows) and every chrome surface built from them. Scoped under
// `.nocms-editor` so it never leaks into the rendered site on the canvas.
//
// Accent discipline (enforced here): the chrome accent is slate `--nc-accent` — Publish,
// "Add a section", selection, active toggles, Insert. Terracotta `--nc-rust` is reserved
// for live-canvas site content and the brand-token swatches a user picks from; it never
// styles chrome. Keeping the two as distinct variables is what stops them mixing.

export const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

export const EDITOR_CSS = `
.nocms-editor {
  --nc-shell: #EAE8E3;
  --nc-surface: #FFFFFF;
  --nc-surface-muted: #FBFAF7;
  --nc-field: #F4F2ED;
  --nc-text: #1A1916;
  --nc-text-2: #6B6760;
  --nc-text-3: #A39E94;
  --nc-accent: #3D5A98;
  --nc-accent-tint: #EEF1F7;
  --nc-rust: #B0542F;
  --nc-amber: #C8862F;
  --nc-olive: #5B6B4A;
  --nc-border: #E0DDD6;
  --nc-border-faint: #EFEDE7;
  --nc-radius: 10px;
  --nc-font-display: Lora, Georgia, serif;
  --nc-font-ui: Inter, system-ui, -apple-system, sans-serif;
  --nc-font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 0;
  overflow: hidden;
  background: var(--nc-shell);
  color: var(--nc-text);
  font-family: var(--nc-font-ui);
  font-size: 13px;
  line-height: 1.4;
  position: relative;
  -webkit-font-smoothing: antialiased;
}
.nocms-editor *, .nocms-editor *::before, .nocms-editor *::after { box-sizing: border-box; }

/* ---------- shared atoms ---------- */
.nc-mono {
  font-family: var(--nc-font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--nc-text-2);
}
.nc-label { display: block; margin-bottom: 7px; }
.nc-field { margin-bottom: 18px; }
.nc-input, .nc-textarea {
  width: 100%; border: 1px solid var(--nc-border); border-radius: var(--nc-radius);
  padding: 9px 11px; font: inherit; font-size: 13px; color: var(--nc-text);
  background: var(--nc-surface); outline: none; transition: border-color .12s, box-shadow .12s;
}
.nc-textarea { line-height: 1.5; resize: vertical; min-height: 54px; }
.nc-input:focus, .nc-textarea:focus {
  border-color: var(--nc-accent); box-shadow: 0 0 0 3px rgba(61,90,152,0.12);
}
.nc-input::placeholder, .nc-textarea::placeholder { color: var(--nc-text-3); }

/* segmented control */
.nc-segmented { display: flex; gap: 2px; background: var(--nc-field); border-radius: 999px; padding: 3px; }
.nc-seg {
  flex: 1; text-align: center; padding: 6px 11px; border-radius: 999px; border: 0;
  background: transparent; color: var(--nc-text-2); font: inherit; font-size: 12.5px;
  font-weight: 500; cursor: pointer; white-space: nowrap; transition: color .1s;
}
.nc-seg[aria-pressed="true"] {
  background: var(--nc-surface); color: var(--nc-text); font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}

/* toggle */
.nc-toggle {
  width: 36px; height: 21px; border-radius: 999px; background: #D8D4CC; border: 0;
  position: relative; cursor: pointer; padding: 0; flex-shrink: 0; transition: background .14s;
}
.nc-toggle[aria-pressed="true"] { background: var(--nc-accent); }
.nc-toggle::after {
  content: ""; position: absolute; top: 2.5px; left: 2.5px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: transform .14s;
}
.nc-toggle[aria-pressed="true"]::after { transform: translateX(15px); }

/* slider */
.nc-slider-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.nc-slider-val { font-family: var(--nc-font-mono); font-size: 12px; color: var(--nc-text); }
.nc-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 5px; border-radius: 999px;
  background: #EDEAE3; outline: none; cursor: pointer; }
.nc-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 15px; height: 15px; border-radius: 50%;
  background: #fff; border: 1px solid #C9C4BA; box-shadow: 0 1px 3px rgba(0,0,0,0.15); margin-top: 0;
}
.nc-slider::-moz-range-thumb {
  width: 15px; height: 15px; border-radius: 50%; background: #fff; border: 1px solid #C9C4BA;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

/* primary slate button */
.nc-btn-primary {
  display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;
  background: var(--nc-accent); color: #fff; border: 0; padding: 11px; border-radius: var(--nc-radius);
  font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
  box-shadow: 0 1px 2px rgba(61,90,152,0.25); transition: filter .12s;
}
.nc-btn-primary:hover { filter: brightness(1.06); }
.nc-btn-ghost {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  border: 1px solid var(--nc-border); background: var(--nc-surface); color: var(--nc-text);
  padding: 9px 16px; border-radius: var(--nc-radius); font: inherit; font-size: 13px;
  font-weight: 600; cursor: pointer;
}
.nc-btn-ghost:hover { background: var(--nc-surface-muted); }

.nc-iconbtn {
  width: 30px; height: 30px; border-radius: 8px; border: 0; background: var(--nc-field);
  color: var(--nc-text-2); display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.nc-iconbtn:hover { background: #ECE9E2; color: var(--nc-text); }

.nc-divider { height: 1px; background: var(--nc-border-faint); border: 0; margin: 18px 0; }

/* ---------- top bar ---------- */
.nocms-topbar {
  height: 56px; min-height: 56px; background: var(--nc-surface); border-bottom: 1px solid var(--nc-border);
  display: flex; align-items: center; padding: 0 16px; gap: 14px; position: relative; z-index: 20;
}
.nc-identity { display: flex; align-items: center; gap: 10px; }
.nc-live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--nc-olive); }
.nc-host { font-family: var(--nc-font-mono); font-size: 12.5px; color: var(--nc-text-2); }
.nc-sep { color: #D5D1C8; }
.nc-page-pill {
  display: flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 8px;
  background: var(--nc-field); border: 0; font: inherit; font-size: 13px; font-weight: 600;
  color: var(--nc-text); cursor: pointer;
}
.nc-spacer { flex: 1; }
.nc-appearance {
  width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--nc-border);
  overflow: hidden; display: flex; cursor: pointer; padding: 0; background: none;
}
.nc-appearance i { display: block; width: 50%; height: 100%; }
.nc-appearance .nc-half-light { background: var(--nc-surface-muted); }
.nc-appearance .nc-half-dark { background: var(--nc-text); }
.nc-vsep { width: 1px; height: 24px; background: var(--nc-border); margin: 0 2px; }
.nc-save { display: flex; align-items: center; gap: 7px; }
.nc-save-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--nc-amber); box-shadow: 0 0 0 3px rgba(200,134,47,0.18); }
.nc-save-text { font-size: 12.5px; color: var(--nc-text-2); }
.nc-link { background: none; border: 0; font: inherit; font-size: 12.5px; color: var(--nc-accent); font-weight: 500; cursor: pointer; padding: 0; }
.nc-publish {
  display: flex; align-items: center; gap: 7px; border: 0; cursor: pointer; font: inherit;
  padding: 8px 16px; border-radius: var(--nc-radius); font-size: 13px; font-weight: 600;
}
.nc-publish-idle { background: var(--nc-accent); color: #fff; box-shadow: 0 1px 2px rgba(61,90,152,0.3); }
.nc-publish-idle:hover { filter: brightness(1.06); }
.nc-publish-busy { background: var(--nc-surface); color: var(--nc-accent); border: 1px solid #C7D2E6; cursor: default; }
.nc-publish-done { background: #EEF1E9; color: #4A5A3A; }
.nc-publish-error { background: #FBEDE9; color: #9A3B23; }
.nc-publish-done .nc-viewlive { color: var(--nc-accent); text-decoration: underline; text-underline-offset: 2px; }
.nc-spin {
  width: 11px; height: 11px; border-radius: 50%; border: 2px solid #C7D2E6; border-top-color: var(--nc-accent);
  display: inline-block; animation: nc-spin 0.7s linear infinite;
}
@keyframes nc-spin { to { transform: rotate(360deg); } }
.nc-avatar {
  width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, var(--nc-olive), var(--nc-accent));
  color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; cursor: pointer; border: 0;
}

/* ---------- body / canvas ---------- */
.nocms-body { flex: 1; display: flex; min-height: 0; position: relative; }
.nocms-canvas-region {
  flex: 1; min-width: 0; background: var(--nc-shell); overflow: auto; position: relative;
  display: flex; justify-content: center; padding: 30px 30px 60px;
}
/* the white surface that hosts the live site, sized to the active breakpoint */
.nocms-editor-canvas {
  width: 1040px; max-width: 100%; background: #fff; border: 1px solid var(--nc-border);
  border-radius: 6px; overflow: visible; align-self: flex-start; position: relative;
  box-shadow: 0 10px 34px rgba(26,25,22,0.07); transition: width .2s ease;
}
.nocms-overlay { outline: 2px solid var(--nc-accent); outline-offset: -1px; pointer-events: none; }
.nocms-hover {
  outline: 1.5px solid rgba(61,90,152,0.4); outline-offset: -1px; pointer-events: none; position: absolute;
}
.nc-hover-label {
  position: absolute; background: var(--nc-accent); color: #fff; font-family: var(--nc-font-mono);
  font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; padding: 3px 8px;
  border-radius: 6px; pointer-events: none; white-space: nowrap;
}
.nocms-editor-canvas .ProseMirror { white-space: pre-wrap; outline: 2px solid var(--nc-accent); outline-offset: 2px; border-radius: 3px; }

/* ---------- right rail ---------- */
.nocms-editor-panel {
  width: 330px; min-width: 330px; background: var(--nc-surface); border-left: 1px solid var(--nc-border);
  height: 100%; overflow-y: auto; display: flex; flex-direction: column; font-size: 13px; color: var(--nc-text);
}
.nc-rail-pad { padding: 20px; }
.nc-rail-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.nc-rail-title { font-size: 15px; font-weight: 600; }
.nc-rail-sub { font-size: 12px; color: var(--nc-text-2); margin-top: 2px; }

/* block-mode header */
.nc-block-head { display: flex; align-items: center; gap: 11px; padding: 18px 20px; border-bottom: 1px solid var(--nc-border-faint); }
.nc-block-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--nc-accent-tint); color: var(--nc-accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.nc-block-name { font-size: 15px; font-weight: 600; }
.nc-block-meta { font-size: 11.5px; color: var(--nc-text-2); margin-top: 1px; font-family: var(--nc-font-mono); letter-spacing: 0.04em; }

/* design & brand entry */
.nc-brand-entry {
  display: flex; align-items: center; justify-content: space-between; width: 100%;
  border: 1px solid var(--nc-border); border-radius: var(--nc-radius); padding: 12px 13px;
  background: var(--nc-surface); cursor: pointer; font: inherit; text-align: left;
}
.nc-brand-entry:hover { background: var(--nc-surface-muted); }
.nc-brand-entry-left { display: flex; align-items: center; gap: 11px; }
.nc-brand-swatches { display: flex; gap: 3px; }
.nc-brand-swatches span { width: 13px; height: 13px; border-radius: 3px; }
.nc-brand-entry-title { font-size: 13px; font-weight: 600; }
.nc-brand-entry-sub { font-size: 11.5px; color: var(--nc-text-2); margin-top: 1px; }

/* design & brand expanded panel */
.nc-brand-panel { border: 1px solid var(--nc-border); border-radius: 12px; overflow: hidden; }
.nc-brand-panel-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 14px; background: var(--nc-surface-muted); border-bottom: 1px solid var(--nc-border-faint); cursor: pointer; }
.nc-brand-panel-body { padding: 16px 14px; }
.nc-swatch-row { display: flex; gap: 11px; align-items: center; flex-wrap: wrap; }
.nc-swatch { width: 28px; height: 28px; border-radius: 50%; cursor: pointer; border: 0; padding: 0; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1); }
.nc-swatch[aria-pressed="true"] { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--nc-accent); }
.nc-more-rows { border-top: 1px solid var(--nc-border-faint); }
.nc-more-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; font-size: 12.5px; color: var(--nc-text-2); cursor: pointer; }
.nc-more-row + .nc-more-row { border-top: 1px solid var(--nc-border-faint); }

/* ---------- block controls ---------- */
.nocms-props-title { font-size: 15px; font-weight: 600; margin: 0; } /* kept for tests */
.nc-eyebrow-input { font-family: var(--nc-font-mono); font-size: 12px; color: var(--nc-text-2); }
.nc-color-field { display: flex; align-items: center; gap: 9px; }
.nc-color-swatch { width: 34px; height: 30px; border-radius: 8px; border: 1px solid var(--nc-border); padding: 2px; cursor: pointer; background: none; }
.nc-color-field .nc-input { flex: 1; }

/* image control */
.nc-image-control { display: flex; align-items: center; gap: 12px; border: 1px solid var(--nc-border); border-radius: var(--nc-radius); padding: 10px; }
.nc-image-thumb { width: 54px; height: 42px; border-radius: 7px; border: 1px solid var(--nc-border); flex-shrink: 0;
  background: repeating-linear-gradient(45deg, #EDEAE3, #EDEAE3 6px, #F6F4EF 6px, #F6F4EF 12px); background-size: cover; background-position: center; }
.nc-image-meta { flex: 1; min-width: 0; }
.nc-image-name { font-size: 12.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nc-image-dim { font-size: 11px; color: var(--nc-text-3); font-family: var(--nc-font-mono); }

/* list control */
.nc-list { display: flex; flex-direction: column; gap: 8px; }
.nc-list-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
.nc-list-count { font-family: var(--nc-font-mono); font-size: 10.5px; color: var(--nc-text-3); }
.nc-list-row { display: flex; align-items: center; gap: 9px; border: 1px solid var(--nc-border); border-radius: var(--nc-radius); padding: 10px 11px; }
.nc-list-row span.nc-list-label { flex: 1; font-size: 13px; }
.nc-grip { color: #C0BBB1; flex-shrink: 0; cursor: grab; }
.nc-list-badge { font-family: var(--nc-font-mono); font-size: 10px; padding: 2px 6px; border-radius: 5px; background: var(--nc-field); color: var(--nc-text-3); }
.nc-list-badge.nc-primary { background: var(--nc-rust); color: #fff; }
.nc-list-add { display: flex; align-items: center; justify-content: center; gap: 7px; border: 1px dashed #D5D1C8; border-radius: var(--nc-radius); padding: 9px; font-size: 12.5px; color: var(--nc-accent); font-weight: 500; cursor: pointer; background: none; width: 100%; }

/* group + advanced */
.nc-group { border: 1px solid var(--nc-border-faint); border-radius: 11px; padding: 14px; margin-bottom: 18px; background: var(--nc-surface-muted); }
.nc-group-title { font-family: var(--nc-font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nc-text); margin-bottom: 14px; }
.nc-group .nc-field:last-child { margin-bottom: 0; }
.nc-row { display: flex; align-items: center; justify-content: space-between; }
.nc-row-label { font-size: 12.5px; color: var(--nc-text-2); }
.nc-disclosure { display: flex; align-items: center; justify-content: space-between; padding: 11px 2px; border-top: 1px solid var(--nc-border-faint); font-size: 13px; color: var(--nc-text-2); cursor: pointer; width: 100%; background: none; border-left: 0; border-right: 0; border-bottom: 0; font-family: inherit; }

.nocms-empty { color: var(--nc-text-2); font-size: 13px; padding: 20px; }

/* ---------- selection toolbar ---------- */
.nocms-toolbar-host { position: absolute; z-index: 30; display: none; }
.nocms-toolbar {
  display: inline-flex; gap: 1px; align-items: center; background: var(--nc-text); border-radius: 9px;
  padding: 5px; box-shadow: 0 6px 20px rgba(0,0,0,0.2);
}
.nocms-toolbar button {
  width: 26px; height: 24px; border: 0; background: transparent; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; border-radius: 6px; padding: 0;
}
.nocms-toolbar button:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
.nocms-toolbar button:disabled { opacity: 0.3; cursor: default; }
.nocms-toolbar .nc-tool-sep { width: 1px; height: 15px; background: #3a3833; margin: 0 3px; }
.nc-tool-drag { cursor: grab; }

/* ---------- overlays / modal ---------- */
.nc-scrim { position: absolute; inset: 0; background: rgba(26,25,22,0.5); display: flex; align-items: flex-start; justify-content: center; padding: 60px 20px; z-index: 40; overflow-y: auto; }
.nc-sheet {
  width: 900px; max-width: 94vw; background: #fff; border-radius: 16px; box-shadow: 0 30px 80px rgba(26,25,22,0.32);
  overflow: hidden; display: flex; flex-direction: column; max-height: 86vh;
}
.nc-sheet-head { padding: 22px 26px 18px; border-bottom: 1px solid var(--nc-border-faint); }
.nc-sheet-titlerow { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
.nc-sheet-title { font-family: var(--nc-font-display); font-size: 21px; font-weight: 600; letter-spacing: -0.01em; }
.nc-sheet-sub { font-size: 13px; color: var(--nc-text-2); margin-top: 3px; }
.nc-sheet-search { display: flex; align-items: center; gap: 10px; border: 1px solid var(--nc-border); border-radius: var(--nc-radius); padding: 10px 13px; background: var(--nc-surface-muted); }
.nc-sheet-search input { flex: 1; border: 0; background: none; outline: none; font: inherit; font-size: 13.5px; color: var(--nc-text); }
.nc-sheet-search input::placeholder { color: var(--nc-text-3); }
.nc-sheet-count { font-family: var(--nc-font-mono); font-size: 11px; color: var(--nc-text-2); }
.nc-chips { display: flex; align-items: center; gap: 8px; margin-top: 14px; }
.nc-chips-label { font-family: var(--nc-font-mono); font-size: 10.5px; letter-spacing: 0.06em; color: var(--nc-text-3); margin-right: 2px; }
.nc-chip { font-size: 12.5px; color: var(--nc-text-2); background: var(--nc-field); padding: 5px 13px; border-radius: 999px; border: 0; cursor: pointer; font-family: inherit; }
.nc-chip[aria-pressed="true"] { font-weight: 600; color: #fff; background: var(--nc-text); }
.nc-sheet-body { padding: 20px 26px 26px; overflow-y: auto; }
.nc-cat-header { font-family: var(--nc-font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--nc-text-3); margin: 2px 0 13px; }
.nc-card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 26px; }
.nc-card-grid:last-child { margin-bottom: 0; }

/* catalog card */
.nc-card { border: 1px solid var(--nc-border); border-radius: 12px; overflow: hidden; background: #fff; cursor: pointer; text-align: left; padding: 0; font: inherit; transition: transform .12s, box-shadow .12s, border-color .12s; position: relative; }
.nc-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(26,25,22,0.1); border-color: #D5D1C8; }
.nc-card-preview { height: 132px; background: var(--nc-surface-muted); border-bottom: 1px solid var(--nc-border-faint); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.nc-card-insert { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(26,25,22,0.18); opacity: 0; transition: opacity .12s; }
.nc-card:hover .nc-card-insert { opacity: 1; }
.nc-card-insert span { background: var(--nc-accent); color: #fff; font-size: 12.5px; font-weight: 600; padding: 8px 18px; border-radius: 999px; box-shadow: 0 4px 12px rgba(61,90,152,0.35); }
.nc-card-foot { padding: 13px 14px; display: flex; align-items: flex-start; gap: 10px; }
.nc-card-glyph { color: var(--nc-text-3); flex-shrink: 0; margin-top: 1px; }
.nc-card-text { flex: 1; min-width: 0; }
.nc-card-name { font-size: 14px; font-weight: 600; }
.nc-card-desc { font-size: 12px; color: var(--nc-text-2); margin-top: 2px; line-height: 1.4; }
.nc-card-badge { font-family: var(--nc-font-mono); font-size: 10px; letter-spacing: 0.04em; color: var(--nc-text-3); padding: 2px 7px; border-radius: 5px; background: var(--nc-field); flex-shrink: 0; }
.nc-card-badge.nc-pack { color: var(--nc-accent); background: var(--nc-accent-tint); }

/* catalog empty state */
.nc-catalog-empty { text-align: center; padding: 54px 20px 60px; }
.nc-catalog-empty-glyph { width: 54px; height: 54px; border-radius: 14px; background: var(--nc-field); color: #B9B4A9; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; }
.nc-catalog-empty-title { font-family: var(--nc-font-display); font-size: 19px; font-weight: 600; margin-bottom: 7px; }
.nc-catalog-empty-sub { font-size: 13.5px; color: var(--nc-text-2); max-width: 38ch; margin: 0 auto; line-height: 1.5; }
.nc-catalog-empty-actions { display: flex; gap: 10px; justify-content: center; margin-top: 22px; }

/* ---------- publish popover ---------- */
.nc-pop-anchor { position: absolute; z-index: 50; }
.nc-popover {
  position: absolute; top: 52px; right: 16px; width: 320px; background: #fff; border: 1px solid var(--nc-border);
  border-radius: 14px; box-shadow: 0 24px 60px rgba(26,25,22,0.24); padding: 18px; z-index: 50;
}
.nc-pop-title { font-family: var(--nc-font-display); font-size: 17px; font-weight: 600; }
.nc-pop-note { font-size: 12.5px; color: var(--nc-text-2); line-height: 1.5; margin: 6px 0 14px; }
.nc-changeset-label { font-family: var(--nc-font-mono); font-size: 10.5px; letter-spacing: 0.06em; color: var(--nc-text-3); margin-bottom: 9px; }
.nc-change { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--nc-text); padding: 4px 0; }
.nc-change-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.nc-change-dot.nc-amber { background: var(--nc-amber); }
.nc-change-dot.nc-olive { background: var(--nc-olive); }
.nc-pop-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; font-size: 11.5px; color: var(--nc-text-3); }

/* ---------- media picker ---------- */
.nc-media-sheet { width: 760px; }
.nc-sheet-foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 26px; border-top: 1px solid var(--nc-border-faint); }
.nocms-expose-list { display: flex; flex-direction: column; }
.nocms-expose-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 4px; border-bottom: 1px solid var(--nc-border-faint); }
.nocms-expose-row:last-child { border-bottom: 0; }
.nocms-expose-label { font-size: 13.5px; color: var(--nc-text); }
.nocms-expose-toggle { font-family: var(--nc-font-mono); font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 11px; border-radius: 999px; border: 1px solid var(--nc-border); background: var(--nc-field); color: var(--nc-text-2); cursor: pointer; }
.nocms-expose-toggle[aria-pressed="true"] { background: var(--nc-accent); border-color: var(--nc-accent); color: #fff; }
.nc-media-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.nc-media-tile { position: relative; border: 0; background: none; padding: 0; cursor: pointer; text-align: left; }
.nc-media-thumb { display: block; height: 96px; border-radius: var(--nc-radius); border: 1px solid var(--nc-border); background-size: cover; background-position: center;
  background-color: var(--nc-surface-muted); background-image: repeating-linear-gradient(45deg, #EDEAE3, #EDEAE3 8px, #F6F4EF 8px, #F6F4EF 16px); }
.nc-media-tile.nc-selected .nc-media-thumb { border: 2px solid var(--nc-accent); box-shadow: 0 0 0 3px rgba(61,90,152,0.12); }
.nc-media-check { position: absolute; top: 7px; right: 7px; width: 20px; height: 20px; border-radius: 50%; background: var(--nc-accent); color: #fff; display: flex; align-items: center; justify-content: center; }
.nc-media-name { display: block; font-size: 11.5px; color: var(--nc-text-2); margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nc-media-upload { height: 96px; border: 1px dashed #D5D1C8; border-radius: var(--nc-radius); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--nc-text-2); font-size: 12px; cursor: pointer; }

/* ---------- sign-in gate ---------- */
.nc-signin-root { align-items: center; justify-content: center; }
.nc-signin-card {
  width: 430px; max-width: 92vw; background: #fff; border: 1px solid var(--nc-border);
  border-radius: 16px; box-shadow: 0 30px 80px rgba(26,25,22,0.18); padding: 38px 34px;
  text-align: center;
}
.nc-signin-mark { font-family: var(--nc-font-display); font-size: 26px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 22px; }
.nc-signin-mark span { color: var(--nc-rust); }
.nc-signin-title { font-family: var(--nc-font-display); font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
.nc-signin-copy { font-size: 13.5px; line-height: 1.55; color: var(--nc-text-2); margin: 10px auto 24px; max-width: 34ch; }
.nc-signin-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px; width: 100%;
  background: var(--nc-text); color: #fff; border: 0; padding: 12px; border-radius: var(--nc-radius);
  font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
}
.nc-signin-btn:hover { filter: brightness(1.15); }
.nc-signin-foot { margin-top: 22px; font-size: 10px; color: var(--nc-text-3); }

/* ---------- library manager ---------- */
.nc-lib-root { background: var(--nc-shell); }
.nc-lib-body { flex: 1; overflow-y: auto; display: flex; justify-content: center; padding: 40px 20px; }
.nc-lib-column { width: 760px; max-width: 100%; }
.nc-lib-titlerow { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; }
.nc-lib-card { background: #fff; border: 1px solid var(--nc-border); border-radius: 12px; padding: 18px 20px; margin-bottom: 14px; }
.nc-lib-head { display: flex; align-items: center; justify-content: space-between; }
.nc-lib-name { font-size: 16px; font-weight: 600; }
.nc-lib-meta { display: flex; align-items: center; gap: 12px; color: var(--nc-text-3); }
.nc-lib-verified { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--nc-olive); }
.nc-lib-desc { font-size: 13px; color: var(--nc-text-2); line-height: 1.5; margin: 9px 0 14px; }
.nc-lib-foot { display: flex; justify-content: flex-end; }
.nc-lib-builtin { color: var(--nc-text-3); }
.nc-lib-add {
  display: flex; align-items: center; justify-content: center; gap: 9px; width: 100%;
  border: 1px dashed #D5D1C8; border-radius: 12px; padding: 18px; margin-top: 4px;
  background: none; color: var(--nc-text-2); font: inherit; font-size: 13px; cursor: pointer;
}
.nc-lib-add:hover { border-color: var(--nc-accent); color: var(--nc-accent); }

/* ---------- navigator ---------- */
.nc-nav-scrim { position: absolute; inset: 0; z-index: 45; }
.nc-navigator { position: absolute; top: 0; left: 0; bottom: 0; width: 316px; background: #fff; border-right: 1px solid var(--nc-border); box-shadow: 12px 0 30px rgba(26,25,22,0.1); padding: 18px 16px; overflow-y: auto; z-index: 46; }
.nc-nav-section-label { font-family: var(--nc-font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--nc-text-3); margin: 18px 4px 8px; display: flex; align-items: center; justify-content: space-between; }
.nc-nav-row { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 9px; cursor: pointer; font-size: 13px; color: var(--nc-text); }
.nc-nav-row:hover { background: var(--nc-surface-muted); }
.nc-nav-row[aria-current="true"] { background: var(--nc-accent-tint); color: var(--nc-accent); font-weight: 600; }
.nc-nav-row .nc-grip { color: #C0BBB1; }
`;
