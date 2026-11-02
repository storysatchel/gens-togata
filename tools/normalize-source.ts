import { readFile, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";
import type { Element } from "@vmprint/engine";
import { bookTheme } from "../src/templates/styles";

/** Structural passes over the native tree. Each returns the number of corrections; 0 means already normal. */
type Pass = (element: Element) => number;

function visitAll(elements: Element[], pass: Pass): number {
  let changed = 0;
  const visit = (element: Element) => {
    changed += pass(element);
    for (const child of element.children ?? []) visit(child);
    for (const slot of element.slots ?? []) for (const child of slot.elements) visit(child);
    for (const zone of element.zones ?? []) for (const child of zone.elements) visit(child);
  };
  for (const element of elements) visit(element);
  return changed;
}

/**
 * Tables marked `semanticRole: stat-metrics`: fixed column widths from the theme geometry, and no per-cell styles
 * (cell typography is theme-owned and applied from the role at output time).
 */
export const metricTables: Pass = element => {
  if (element.type !== "table" || element.properties?.semanticRole !== "stat-metrics") return 0;
  let changed = 0;
  const columns = element.table?.columns;
  if (!columns?.length) throw new Error(`Metric table ${element.properties.sourceId ?? "<unnamed>"} has no columns`);
  const width = (bookTheme.geometry.contentWidth - bookTheme.geometry.columnGap) / 2 / columns.length;
  if (columns.some(column => column.mode !== "fixed" || column.value !== width)) {
    element.table!.columns = columns.map(() => ({ mode: "fixed", value: width }));
    changed++;
  }
  for (const row of element.children ?? []) for (const cell of row.children ?? []) {
    if (cell.properties?.style !== undefined) {
      delete cell.properties.style;
      changed++;
    }
  }
  return changed;
};

/**
 * Unannotated runs carrying exactly the keyword presentation (bold + annotation colour) become `semanticRole: keyword`
 * and lose that style; the theme restores it. A run using the annotation colour with any other styling is ambiguous
 * and is reported rather than guessed.
 */
export const keywordRuns: Pass = element => {
  if (element.type !== "text" || element.properties?.semanticRole !== undefined) return 0;
  const style = element.properties?.style;
  if (!style || style.color !== bookTheme.colors.annotation) return 0;
  const keys = Object.keys(style);
  if (keys.length !== 2 || style.fontWeight !== "bold") {
    throw new Error(`Ambiguous annotation-coloured run ${element.properties!.sourceId}: ${JSON.stringify(style)}`);
  }
  element.properties!.semanticRole = "keyword";
  delete element.properties!.style;
  return 1;
};

export function normalizeSource(elements: Element[]): { metrics: number; keywords: number } {
  return { metrics: visitAll(elements, metricTables), keywords: visitAll(elements, keywordRuns) };
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const paths = args.filter(arg => arg !== "--check");
  if (!paths.length) throw new Error("Usage: bun run tools/normalize-source.ts [--check] FILE...");
  for (const path of paths) {
    const document = parse(await readFile(path, "utf8"));
    if (!document || !Array.isArray(document.elements)) throw new Error(`${path}: expected a native document with elements`);
    const result = normalizeSource(document.elements);
    const total = result.metrics + result.keywords;
    if (total && check) throw new Error(`${path}: ${total} corrections needed (${result.metrics} metric, ${result.keywords} keyword)`);
    if (total) await writeFile(path, stringify(document, { lineWidth: 0, aliasDuplicateObjects: false }));
    console.log(`${path}: ${result.metrics} metric, ${result.keywords} keyword corrections`);
  }
}
