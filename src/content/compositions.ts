import type { Element } from "@vmprint/engine";
import { inline } from "../inline/inline";
import { bookTheme } from "../templates/styles";

/** Build a native table for authors generating logical source; IDs must be assigned before saving. */
export function composeTable(columns: string[], rows: string[][]): Element {
  if (!columns.length || rows.some(row => row.length !== columns.length)) {
    throw new Error("A table requires columns and equally sized rows");
  }
  return {
    type: "table", content: "",
    table: { headerRows: 1, repeatHeader: true, columns: columns.map(() => ({ mode: "flex", fr: 1 })), headerCellStyle: bookTheme.table.headerCellStyle },
    children: [columns, ...rows].map((row, index) => ({
      type: "table-row", content: "",
      ...(index === 0 ? { properties: { semanticRole: "header" } } : {}),
      children: row.map(cell => ({ type: "table-cell", content: "", children: inline(cell) })),
    })),
  };
}


export interface AdversaryProfile {
  name: string;
  kind?: string;
  description?: string;
  characteristics?: Record<string, string | number>;
  derived?: Record<string, string | number>;
  fields?: { label?: string; text: string }[];
}

/**
 * Compose an adversary into native book elements. Callers assign stable sourceId
 * values to the returned elements and their runs before persisting them.
 */
export function composeAdversary(profile: AdversaryProfile): Element[] {
  const text = (type: string, content: string, semanticRole?: string): Element => ({
    type, content: "", children: inline(content), ...(semanticRole ? { properties: { semanticRole } } : {}),
  });
  const result = [text("stat-name", profile.name, "statblock")];
  if (profile.kind) result.push(text("stat-kind", profile.kind));
  if (profile.description) result.push(text("stat-desc", profile.description));
  for (const metrics of [profile.characteristics, profile.derived]) {
    if (!metrics || !Object.keys(metrics).length) continue;
    const table = composeTable(Object.keys(metrics), [Object.values(metrics).map(String)]);
    const width = (bookTheme.geometry.contentWidth - bookTheme.geometry.columnGap) / 2 / table.table!.columns!.length;
    table.table!.columns = table.table!.columns!.map(() => ({ mode: "fixed", value: width }));
    table.properties = { ...table.properties, semanticRole: "stat-metrics" };
    result.push(table);
  }
  for (const field of profile.fields ?? []) {
    result.push(text("stat-field", `${field.label ? `**${field.label}:** ` : ""}${field.text}`));
  }
  return result;
}
/** Check the rectangular native table model, including cell spans. */
export function tableError(element: Element): string | undefined {
  const columns = element.table?.columns;
  if (!Array.isArray(columns) || columns.length === 0) return "table.columns must be a nonempty array";
  if (!Array.isArray(element.children) || element.children.length === 0) return "table must contain rows";
  const headerRows = element.table?.headerRows ?? 0;
  if (!Number.isInteger(headerRows) || headerRows < 0 || headerRows > element.children.length) return "invalid table.headerRows";
  const occupied = Array<number>(columns.length).fill(0);
  for (const [i, row] of element.children.entries()) {
    if (row.type !== "table-row" || !Array.isArray(row.children)) return `row ${i + 1} must contain table-cell elements`;
    let column = 0;
    for (const cell of row.children) {
      if (cell.type !== "table-cell") return `row ${i + 1} contains a non-cell element`;
      const width = cell.properties?.colSpan ?? 1;
      const height = cell.properties?.rowSpan ?? 1;
      if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1 || i + height > element.children.length) return `row ${i + 1} has an invalid cell span`;
      while (column < columns.length && occupied[column] > 0) column++;
      if (column + width > columns.length || occupied.slice(column, column + width).some(value => value > 0)) return `row ${i + 1} has overlapping or overflowing cells`;
      for (let j = column; j < column + width; j++) occupied[j] = height;
      column += width;
    }
    if (occupied.some(value => value === 0)) return `row ${i + 1} does not fill all ${columns.length} columns`;
    for (let j = 0; j < occupied.length; j++) occupied[j]--;
  }
  return undefined;
}
