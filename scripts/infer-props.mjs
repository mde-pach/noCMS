/**
 * Infer a component's editable props from its own source.
 *
 * A component library ships TypeScript props, not Zod schemas. Requiring a descriptor
 * before a component could be edited would mean an imported library is placeable but
 * inert — reachable in name only. So the props are read from the component itself, and
 * a descriptor becomes an override for better labels and roles rather than the price
 * of admission.
 *
 * Runs at build time, so the TypeScript compiler never reaches the browser.
 */
import ts from "typescript";

/** Children are composed on the canvas, not typed into a sidebar. */
const SKIP = new Set(["children", "className", "class", "key", "ref", "style"]);

function literalUnion(node) {
  if (!ts.isUnionTypeNode(node)) return null;
  const options = node.types.map((t) =>
    ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal) ? t.literal.text : null,
  );
  return options.every(Boolean) ? options : null;
}

/** `keyof typeof VARIANTS` — resolve the object's keys in the same file. */
function keyofTypeof(node, sourceFile) {
  if (!ts.isTypeOperatorNode(node) || node.operator !== ts.SyntaxKind.KeyOfKeyword)
    return null;
  const inner = node.type;
  if (!ts.isTypeQueryNode(inner) || !ts.isIdentifier(inner.exprName)) return null;
  const name = inner.exprName.text;

  let keys = null;
  const visit = (n) => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === name &&
      n.initializer
    ) {
      let init = n.initializer;
      if (ts.isAsExpression(init)) init = init.expression;
      if (ts.isObjectLiteralExpression(init)) {
        keys = init.properties
          .map((p) =>
            p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
              ? p.name.text
              : null,
          )
          .filter(Boolean);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sourceFile);
  return keys;
}

function describeType(typeNode, sourceFile) {
  if (!typeNode) return { field: "text" };
  if (typeNode.kind === ts.SyntaxKind.StringKeyword) return { field: "text" };
  if (typeNode.kind === ts.SyntaxKind.NumberKeyword) return { field: "number" };
  if (typeNode.kind === ts.SyntaxKind.BooleanKeyword) return { field: "toggle" };

  const union = literalUnion(typeNode);
  if (union) return { field: "select", options: union };

  const keys = keyofTypeof(typeNode, sourceFile);
  if (keys?.length) return { field: "select", options: keys };

  if (ts.isUnionTypeNode(typeNode)) {
    // `string | undefined` and friends: fall back to the non-nullish member.
    const real = typeNode.types.find(
      (t) =>
        t.kind !== ts.SyntaxKind.UndefinedKeyword &&
        t.kind !== ts.SyntaxKind.NullKeyword,
    );
    if (real) return describeType(real, sourceFile);
  }
  return null; // a shape the editor cannot offer a control for
}

const defaultOf = (element) => {
  if (!element?.initializer) return undefined;
  const init = element.initializer;
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isNumericLiteral(init)) return Number(init.text);
  if (init.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (init.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
};

/** Props of a React-style component: the destructured, annotated first parameter. */
export function inferFromTsx(source, filename = "component.tsx") {
  const sourceFile = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const props = {};

  const readParam = (param) => {
    if (!param) return;
    const defaults = new Map();
    if (param.name && ts.isObjectBindingPattern(param.name)) {
      for (const element of param.name.elements) {
        if (ts.isIdentifier(element.name))
          defaults.set(element.name.text, defaultOf(element));
      }
    }
    const type = param.type;
    if (!type || !ts.isTypeLiteralNode(type)) {
      // No inline type: offer whatever was destructured, as text.
      for (const [name, value] of defaults) {
        if (SKIP.has(name)) continue;
        props[name] = {
          field: "text",
          ...(value === undefined ? {} : { default: value }),
        };
      }
      return;
    }
    for (const member of type.members) {
      if (!ts.isPropertySignature(member) || !member.name) continue;
      const name = member.name.getText(sourceFile);
      if (SKIP.has(name)) continue;
      const described = describeType(member.type, sourceFile);
      if (!described) continue;
      const value = defaults.get(name);
      props[name] = {
        ...described,
        ...(value === undefined ? {} : { default: value }),
      };
    }
  };

  const visit = (node) => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node)) &&
      node.parameters.length
    ) {
      const isDefault = node.modifiers?.some(
        (m) => m.kind === ts.SyntaxKind.DefaultKeyword,
      );
      const isNamed = ts.isFunctionDeclaration(node) && node.name;
      if (isDefault || isNamed || Object.keys(props).length === 0)
        readParam(node.parameters[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return props;
}

/**
 * Props of an .astro component.
 *
 * Astro's idiom is `interface Props { … }` in the frontmatter, which carries real types —
 * so a union there becomes a proper choice rather than a text box. Falls back to whatever
 * the frontmatter destructures when no interface is declared.
 */
export function inferFromAstro(source) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const declared = inferFromPropsInterface(frontmatter);

  const destructure = frontmatter.match(/const\s*\{([^}]*)\}\s*=\s*Astro\.props/);
  if (!destructure) return declared;
  const props = {};
  for (const part of destructure[1].split(",")) {
    const [rawName, rawDefault] = part.split("=").map((s) => s.trim());
    const name = rawName?.replace(/:.*$/, "").trim();
    if (!name || SKIP.has(name)) continue;
    let value;
    if (rawDefault) {
      const quoted = rawDefault.match(/^['"](.*)['"]$/);
      if (quoted) value = quoted[1];
      else if (rawDefault === "true" || rawDefault === "false")
        value = rawDefault === "true";
      else if (/^-?\d+(\.\d+)?$/.test(rawDefault)) value = Number(rawDefault);
    }
    props[name] = {
      // A declared type beats a guess from the default value.
      ...(declared[name] ?? {
        field:
          typeof value === "boolean"
            ? "toggle"
            : typeof value === "number"
              ? "number"
              : "text",
      }),
      ...(value === undefined ? {} : { default: value }),
    };
  }
  // Declared but not destructured is still a real prop.
  for (const [name, meta] of Object.entries(declared)) props[name] ??= meta;
  return props;
}

/** `interface Props { variant?: "solid" | "outline" }` — Astro's own idiom, with real types. */
function inferFromPropsInterface(frontmatter) {
  const file = ts.createSourceFile(
    "props.ts",
    `${frontmatter}\nexport {};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const props = {};
  const visit = (node) => {
    const isProps =
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      node.name.text === "Props";
    if (isProps) {
      const members = ts.isInterfaceDeclaration(node)
        ? node.members
        : ts.isTypeLiteralNode(node.type)
          ? node.type.members
          : [];
      for (const member of members) {
        if (!ts.isPropertySignature(member) || !member.name) continue;
        const name = member.name.getText(file);
        if (SKIP.has(name)) continue;
        const described = describeType(member.type, file);
        if (described) props[name] = described;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return props;
}

export function inferProps(source, filename) {
  if (/\.astro$/.test(filename)) return inferFromAstro(source);
  if (/\.[jt]sx$/.test(filename)) return inferFromTsx(source, filename);
  return {};
}
