// Tokens-as-bricks: the design panel edits tokens as semantic, opinionated choices
// (brand color, fonts, spacing, radius) — human-labeled and grouped, never raw var
// names. An edit updates the token's value, emits the new flat source (the file written
// back to git) and the CSS-variable block (applied live with no rebuild — invariant #3).

import { formatTokens, type Token, toCssVariables } from "@nocms/tokens";
import type { VNode } from "preact";

type FieldKind = "color" | "text";

interface SemanticField {
  /** the flat token name this field edits */
  token: string;
  label: string;
  kind: FieldKind;
}

interface TokenGroup {
  title: string;
  fields: SemanticField[];
}

// The opinionated map from human concepts to the starter's token names. A field whose
// token is absent from the document is simply skipped, so this degrades gracefully.
const GROUPS: TokenGroup[] = [
  {
    title: "Color",
    fields: [
      { token: "color.brand.500", label: "Brand", kind: "color" },
      { token: "color.brand.600", label: "Brand (hover)", kind: "color" },
      { token: "color.text", label: "Text", kind: "color" },
      { token: "color.bg", label: "Background", kind: "color" },
    ],
  },
  {
    title: "Typography",
    fields: [
      { token: "font.heading", label: "Heading font", kind: "text" },
      { token: "font.body", label: "Body font", kind: "text" },
    ],
  },
  {
    title: "Spacing",
    fields: [
      { token: "space.sm", label: "Small", kind: "text" },
      { token: "space.md", label: "Medium", kind: "text" },
      { token: "space.lg", label: "Large", kind: "text" },
    ],
  },
  {
    title: "Shape",
    fields: [{ token: "radius.md", label: "Corner radius", kind: "text" }],
  },
];

export interface TokensPanelProps {
  tokens: Token[];
  /** fired after every edit with the updated tokens, flat source, and CSS variables. */
  onChange: (next: Token[], flat: string, css: string) => void;
}

export function TokensPanel({ tokens, onChange }: TokensPanelProps): VNode {
  const byName = new Map(tokens.map((t) => [t.name, t]));

  const setValue = (name: string, value: string) => {
    const next = tokens.map((t) => (t.name === name ? { ...t, value } : t));
    onChange(next, formatTokens(next), toCssVariables(next));
  };

  return (
    <div class="nocms-tokens">
      {GROUPS.map((group) => {
        const present = group.fields.filter((f) => byName.has(f.token));
        if (present.length === 0) return null;
        return (
          <section key={group.title} class="nocms-tokens-group">
            <h3 class="nocms-tokens-title">{group.title}</h3>
            {present.map((field) => (
              <TokenField
                key={field.token}
                field={field}
                value={byName.get(field.token)?.value ?? ""}
                onInput={(value) => setValue(field.token, value)}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

interface TokenFieldProps {
  field: SemanticField;
  value: string;
  onInput: (value: string) => void;
}

function TokenField({ field, value, onInput }: TokenFieldProps): VNode {
  const id = `nocms-token-${field.token}`;
  return (
    <div class="nocms-field">
      <label for={id}>{field.label}</label>
      <input
        id={id}
        name={field.token}
        type={field.kind === "color" ? "color" : "text"}
        value={value}
        onInput={(e) => onInput(e.currentTarget.value)}
      />
    </div>
  );
}
