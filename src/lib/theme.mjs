/**
 * The theme is a plain CSS file of custom properties. Owners edit the VALUES through
 * pickers; they never write rules. Because the values are custom properties, changing
 * one re-themes the whole canvas by writing a variable — no re-render at all, which is
 * what makes §4.4 feel instant.
 */
const ROOT_RE = /(:root\s*\{)([^}]*)\}/;
const DECL_RE = /(--[\w-]+)\s*:\s*([^;]+);/g;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const isColour = (value) =>
  HEX.test(value.trim()) || /^(rgb|hsl|oklch|color)\(/i.test(value.trim());

/** Read the tokens from the first :root block, in file order. */
export function parseTheme(css) {
  const block = ROOT_RE.exec(css ?? "");
  if (!block) return [];
  const tokens = [];
  for (const [, name, raw] of block[2].matchAll(DECL_RE)) {
    const value = raw.trim();
    tokens.push({ name, value, kind: isColour(value) ? "colour" : "text" });
  }
  return tokens;
}

/** Rewrite one token in place, leaving the rest of the file untouched. */
export function setToken(css, name, value) {
  const block = ROOT_RE.exec(css);
  if (!block) return css;
  const [full, open, body] = block;
  const re = new RegExp(`(${name}\\s*:\\s*)([^;]+)(;)`);
  if (!re.test(body)) return css;
  const nextBody = body.replace(re, `$1${value}$3`);
  return css.replace(full, `${open}${nextBody}}`);
}

/** Group tokens the way a person thinks about them, not the way CSS stores them. */
export function groupTokens(tokens) {
  const group = (name) => {
    if (/color|colour|brand|ink|surface|border/.test(name)) return "Colour";
    if (/font|step/.test(name)) return "Type";
    if (/space|radius|measure/.test(name)) return "Spacing";
    return "Other";
  };
  const out = new Map();
  for (const token of tokens) {
    const key = group(token.name);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(token);
  }
  return out;
}
