import type { Element } from "@vmprint/engine";
import type { ContentBlock, SidebarBlock, TableBlock, StatBlock } from "../content/types";
import { inline } from "../inline/inline";

export function text(type: string, value: string, sourceId?: string): Element {
  return { type, content: "", children: inline(value), ...(sourceId ? { properties: { sourceId } } : {}) };
}
export function sidebar(block: SidebarBlock): Element[] {
  return [
    { ...text("sidebar", `**${block.title}**`), properties: { keepWithNext: true } },
    ...(block.body ?? []).map(value => text("sidebar", value)),
  ];
}
function list(items: string[], ordered: boolean): Element[] {
  // Preserve the existing authored-list behavior; native VMPrint lists are available for a later model migration.
  return items.map((item, index) => ({
    ...text("list-item", `${ordered ? `${index + 1}.` : "•"} ${item}`),
    properties: { style: { marginLeft: 10, textIndent: -10 } },
  }));
}
function table(block: TableBlock): Element {
  return { type: "table", content: "", columnSpan: "all", table: {
    headerRows: 1, repeatHeader: true,
    columns: block.columns.map((_, index) => block.style === "motiv" && index === 0 ? { mode: "fixed", value: 30 } : { mode: "flex", fr: 1 }),
    headerCellStyle: { fontWeight: 700, backgroundColor: "#e6dece" },
  }, children: [block.columns, ...block.rows].map((row, i) => ({
    type: "table-row", content: "", ...(i === 0 ? { properties: { semanticRole: "header" } } : {}),
    children: row.map((cell, index) => ({
      ...text("table-cell", String(cell ?? "")),
      ...(block.style === "motiv" && index === 0 ? { properties: { style: { textAlign: "center", fontWeight: 700 } } } : {}),
    })),
  })) };
}
const characteristics: Record<string, string> = { Br: "Brawn", Ag: "Agility", Int: "Intellect", Cun: "Cunning", Will: "Willpower", Pr: "Presence" };
const derived: Record<string, string> = { Soak: "Soak Value", "W.T.": "Wound Threshold", "S.T.": "Strain Threshold", Def: "Defense", "Def (M/R)": "Defense (Melee / Ranged)" };
function statblock(block: StatBlock): Element[] {
  const result = [text("stat-name", block.name ?? "")];
  if (block.kind) result.push(text("stat-kind", block.kind));
  if (block.desc) result.push(text("stat-desc", block.desc));
  for (const [values, labels] of [[block.chars, characteristics], [block.derived, derived]] as const) {
    if (!values || !Object.keys(values).length) continue;
    const metrics = table({ type: "table", columns: Object.keys(values).map(key => labels[key] ?? key), rows: [Object.values(values).map(String)] });
    delete metrics.columnSpan;
    for (const row of metrics.children ?? []) for (const cell of row.children ?? []) {
      cell.properties = { style: { fontSize: 4.5, padding: 1.5, textAlign: "center" } };
    }
    result.push(metrics);
  }
  for (const field of block.fields ?? []) result.push(text("stat-field", `${field.label ? `**${field.label}:** ` : ""}${field.text ?? ""}`));
  return result;
}
export function blocks(block: ContentBlock, sourceId: string): Element[] {
  switch (block.type) {
    case "sidebar": return sidebar(block);
    case "table": return [table(block)];
    case "statblock": return statblock(block);
    case "procedure": return [text("h4", block.title), ...list(block.steps, true)];
    case "list": return list(block.items, false);
    case "endnotes": return [text("h4", block.title ?? "Notes"), ...list(block.items, true)].map(element => ({
      ...element, columnSpan: "all", properties: { ...element.properties, style: { ...element.properties?.style, fontSize: 6 } },
    }));
    default: {
      const type = block.type === "p" ? (!block.style || block.style === "body" ? "p" : block.style) : block.type;
      const value = block.type === "synopsis" ? `**Synopsis.** ${block.text}` : block.text;
      const result: Element[] = [];
      // Keep the anchor in reading order rather than detaching the sidebar from its paragraph.
      if (block.sidebar) {
        const [before, after] = value.split("{{sidebar}}");
        if (before) result.push(text(type, before));
        result.push(...sidebar(block.sidebar));
        if (after) result.push(text(type, after));
      } else result.push(text(type, value, sourceId));
      if (block.type === "h2" || block.type === "scenario" || (block.type === "p" && block.style === "opening")) {
        for (const element of result) element.columnSpan = "all";
      }
      return result;
    }
  }
}
