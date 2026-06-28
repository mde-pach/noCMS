import { formatTokens, type Token, toCssVariables } from "@nocms/tokens";
import type { VNode } from "preact";
import { useState } from "preact/hooks";
import { ChevronRight } from "./icons.js";

// The curated palette a site owner picks a primary color from.
const SWATCHES: [name: string, hex: string][] = [
  ["Terracotta", "#B0542F"],
  ["Olive", "#5B6B4A"],
  ["Slate blue", "#3D5A98"],
  ["Ochre", "#BC9A4A"],
  ["Near-black", "#1A1916"],
];

const BRAND_TOKEN = "color.brand.500";
const BRAND_HOVER_TOKEN = "color.brand.600";
const RADIUS_TOKEN = "radius.md";

function radiusPx(value: string | undefined): number {
  if (!value) return 10;
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return 10;
  return value.includes("rem") ? Math.round(n * 16) : Math.round(n);
}

export interface TokensPanelProps {
  tokens: Token[];
  /** fired after every edit with the updated tokens, flat source, and CSS variables. */
  onChange: (next: Token[], flat: string, css: string) => void;
}

export function TokensPanel({ tokens, onChange }: TokensPanelProps): VNode {
  const [template, setTemplate] = useState<"Editorial" | "Studio">("Editorial");
  const byName = new Map(tokens.map((t) => [t.name, t]));
  const brand = byName.get(BRAND_TOKEN)?.value ?? "";
  const radius = radiusPx(byName.get(RADIUS_TOKEN)?.value);

  const setValues = (updates: Record<string, string>) => {
    const next = tokens.map((t) =>
      t.name in updates ? { ...t, value: updates[t.name] as string } : t,
    );
    onChange(next, formatTokens(next), toCssVariables(next));
  };

  const pickBrand = (hex: string) => {
    const updates: Record<string, string> = { [BRAND_TOKEN]: hex };
    if (byName.has(BRAND_HOVER_TOKEN)) updates[BRAND_HOVER_TOKEN] = hex;
    setValues(updates);
  };

  return (
    <div class="nocms-tokens">
      <div class="nc-field">
        <span class="nc-mono nc-label">Template</span>
        <div class="nc-segmented" role="group" aria-label="Template">
          {(["Editorial", "Studio"] as const).map((t) => (
            <button
              key={t}
              type="button"
              class="nc-seg"
              aria-pressed={template === t}
              onClick={() => setTemplate(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {byName.has(BRAND_TOKEN) ? (
        <div class="nc-field">
          <span class="nc-mono nc-label">Primary color</span>
          <div class="nc-swatch-row">
            {SWATCHES.map(([name, hex]) => (
              <button
                key={hex}
                type="button"
                name={BRAND_TOKEN}
                value={hex}
                class="nc-swatch"
                title={name}
                aria-label={name}
                aria-pressed={brand.toLowerCase() === hex.toLowerCase()}
                style={`background:${hex}`}
                onClick={() => pickBrand(hex)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {byName.has(RADIUS_TOKEN) ? (
        <div class="nc-field">
          <div class="nc-slider-head">
            <span class="nc-mono nc-label" style="margin-bottom:0">
              Corner radius
            </span>
            <span class="nc-slider-val">{radius}px</span>
          </div>
          <input
            class="nc-slider"
            name={RADIUS_TOKEN}
            type="range"
            min={0}
            max={24}
            value={String(radius)}
            onInput={(e) => setValues({ [RADIUS_TOKEN]: `${e.currentTarget.value}px` })}
          />
        </div>
      ) : null}

      <div class="nc-more-rows">
        <div class="nc-more-row">
          <span>Typography scale</span>
          <ChevronRight size={12} />
        </div>
        <div class="nc-more-row">
          <span>Spacing density</span>
          <ChevronRight size={12} />
        </div>
      </div>
    </div>
  );
}
