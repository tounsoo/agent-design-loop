import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

export function listSourceFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "dist") continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) continue;
      files.push(full);
    }
  };
  walk(root);
  return files;
}

export function parseFile(file: string): ts.SourceFile {
  const text = readFileSync(file, "utf8");
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
}

export function jsxTagName(name: ts.JsxTagNameExpression): string {
  if (ts.isIdentifier(name)) return name.text;
  if (ts.isPropertyAccessExpression(name) && ts.isIdentifier(name.expression)) {
    return `${name.expression.text}.${name.name.text}`;
  }
  return name.getText();
}

export function walk(node: ts.Node, visit: (node: ts.Node) => void): void {
  visit(node);
  ts.forEachChild(node, (child) => walk(child, visit));
}

export function jsxElements(root: ts.Node, tag: string): ts.JsxElement[] {
  const found: ts.JsxElement[] = [];
  walk(root, (node) => {
    if (ts.isJsxElement(node) && jsxTagName(node.openingElement.tagName) === tag) found.push(node);
  });
  return found;
}

export function attributeValue(opening: ts.JsxOpeningLikeElement, name: string): string | null | "dynamic" {
  for (const prop of opening.attributes.properties) {
    if (!ts.isJsxAttribute(prop)) continue;
    const attrName = ts.isIdentifier(prop.name) ? prop.name.text : prop.name.getText();
    if (attrName !== name) continue;
    if (!prop.initializer) return "";
    if (ts.isStringLiteral(prop.initializer)) return prop.initializer.text;
    if (
      ts.isJsxExpression(prop.initializer) &&
      prop.initializer.expression &&
      ts.isStringLiteral(prop.initializer.expression)
    ) {
      return prop.initializer.expression.text;
    }
    return "dynamic";
  }
  return null;
}

export function elementText(node: ts.Node): { text: string; dynamic: boolean } {
  let text = "";
  let dynamic = false;
  const visit = (current: ts.Node) => {
    if (ts.isJsxText(current)) text += current.text;
    else if (ts.isJsxExpression(current)) {
      if (current.expression && ts.isStringLiteral(current.expression)) text += current.expression.text;
      else if (current.expression) dynamic = true;
    }
    ts.forEachChild(current, visit);
  };
  ts.forEachChild(node, visit);
  return { text: text.replace(/\s+/g, " ").trim(), dynamic };
}

export function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}
