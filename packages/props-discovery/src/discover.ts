import ts from "typescript";
import type { ComponentSchema, Control } from "./index";

// Names that denote a render slot rather than a scalar prop.
const SLOT_TYPES = new Set([
  "ReactNode",
  "ComponentChildren",
  "ComponentChild",
  "VNode",
]);

export interface DiscoverOptions {
  /** which component to read; defaults to the first one found */
  component?: string;
}

export function discoverControls(
  source: string,
  options: DiscoverOptions = {},
): ComponentSchema {
  const sf = ts.createSourceFile(
    "c.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const found = findComponent(sf, options.component);
  if (!found) throw new Error("no component with a typed props parameter found");

  const members = found.propsType ? resolveMembers(sf, found.propsType) : [];
  const controls = members.map(toControl).filter((c): c is Control => c !== null);
  return { component: found.name, controls };
}

interface FoundComponent {
  name: string;
  propsType: ts.TypeNode | undefined;
}

function findComponent(sf: ts.SourceFile, name?: string): FoundComponent | undefined {
  let result: FoundComponent | undefined;

  const consider = (
    candidate: string,
    params: ts.NodeArray<ts.ParameterDeclaration>,
  ) => {
    if (result) return;
    if (name && candidate !== name) return;
    result = { name: candidate, propsType: params[0]?.type };
  };

  for (const stmt of sf.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      consider(stmt.name.text, stmt.parameters);
    } else if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer))
        ) {
          consider(decl.name.text, decl.initializer.parameters);
        }
      }
    }
  }
  return result;
}

function resolveMembers(
  sf: ts.SourceFile,
  typeNode: ts.TypeNode,
): ts.PropertySignature[] {
  if (ts.isTypeLiteralNode(typeNode)) {
    return typeNode.members.filter(ts.isPropertySignature);
  }
  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    const target = typeNode.typeName.text;
    for (const stmt of sf.statements) {
      if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === target) {
        return stmt.members.filter(ts.isPropertySignature);
      }
      if (
        ts.isTypeAliasDeclaration(stmt) &&
        stmt.name.text === target &&
        ts.isTypeLiteralNode(stmt.type)
      ) {
        return stmt.type.members.filter(ts.isPropertySignature);
      }
    }
  }
  return [];
}

function toControl(prop: ts.PropertySignature): Control | null {
  if (!ts.isIdentifier(prop.name)) return null;
  const propName = prop.name.text;
  const required = !prop.questionToken;
  const kindInfo = classify(prop.type, propName);
  if (!kindInfo) return null;
  return { prop: propName, required, ...kindInfo };
}

type KindInfo = Pick<Control, "kind" | "options">;

function classify(type: ts.TypeNode | undefined, propName: string): KindInfo | null {
  if (propName === "children") return { kind: "slot" };
  if (!type) return { kind: "text" };

  switch (type.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { kind: "text" };
    case ts.SyntaxKind.NumberKeyword:
      return { kind: "number" };
    case ts.SyntaxKind.BooleanKeyword:
      return { kind: "boolean" };
  }

  if (ts.isFunctionTypeNode(type)) return { kind: "action" };

  if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)) {
    if (SLOT_TYPES.has(type.typeName.text)) return { kind: "slot" };
  }

  if (ts.isUnionTypeNode(type)) {
    const options = stringLiteralOptions(type);
    if (options) return { kind: "select", options };
  }

  return { kind: "text" };
}

function stringLiteralOptions(union: ts.UnionTypeNode): string[] | undefined {
  const options: string[] = [];
  for (const member of union.types) {
    if (member.kind === ts.SyntaxKind.UndefinedKeyword) continue;
    if (ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)) {
      options.push(member.literal.text);
    } else {
      return undefined;
    }
  }
  return options.length > 0 ? options : undefined;
}
