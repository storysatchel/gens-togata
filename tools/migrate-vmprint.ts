#!/usr/bin/env bun
/**
 * Convert a legacy chapters/blocks YAML document into persisted VMPrint elements.
 * Usage: bun tools/migrate-vmprint.ts INPUT.yaml OUTPUT.yaml
 * INPUT and OUTPUT may be the same file. An already-native input is left alone
 * in place or copied verbatim to a new output; an existing distinct output is
 * never overwritten, so authored identities cannot be accidentally replaced.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse, stringify } from "yaml";
import type { Element } from "@vmprint/engine";
import { inline } from "../src/inline/inline";
import { composeAdversary } from "../src/content/compositions";
import { bookTheme } from "../src/templates/styles";

type LegacyBlock = {
  type: string; text?: string; style?: string; title?: string; body?: string[];
  sidebar?: LegacyBlock; items?: string[]; steps?: string[]; columns?: string[];
  rows?: (string | number)[][]; name?: string; kind?: string; desc?: string;
  chars?: Record<string, string | number>; derived?: Record<string, string | number>;
  fields?: { label?: string; text?: string }[];
};
type LegacyChapter = { title: string; part?: { label?: string; title: string }; blocks: LegacyBlock[] };
const object = (x: unknown): x is Record<string, unknown> => x !== null && typeof x === "object" && !Array.isArray(x);
const strings = (x: unknown): x is string[] => Array.isArray(x) && x.every(value => typeof value === "string");
const bad = (where: string, message: string): never => { throw new Error(`${where}: ${message}`); };
const chars: Record<string, string> = { Br: "Brawn", Ag: "Agility", Int: "Intellect", Cun: "Cunning", Will: "Willpower", Pr: "Presence" };
const derived: Record<string, string> = { Soak: "Soak Value", "W.T.": "Wound Threshold", "S.T.": "Strain Threshold", Def: "Defense", "Def (M/R)": "Defense (Melee / Ranged)" };
const audioGroups: Record<string, number> = {
  "Introduction": 1, "Setting Overview": 1, "Character Creation": 2, "The Theater of Power": 3,
  "New Skills": 4, "New Talents": 4, "Gear and Vehicles": 5, "Game Mastering Rome": 6,
  "Adversaries": 7, "Starter Scenarios": 8, "Lexicon": 9, "A Gazetteer of the Roman World": 9,
  "Sources & Resources": 9,
};

function onlyKeys(value: Record<string, unknown>, allowed: readonly string[], where: string): void {
  const extra = Object.keys(value).find(key => !allowed.includes(key));
  if (extra) bad(where, `unsupported property ${extra}; refusing to discard authored data`);
}

// `inline` emits semantic runs only; presentation is applied from the theme at output time.
const runs = inline;
function text(type: string, value: string, role?: string): Element {
  return { type, content: "", children: runs(value), ...(role ? { properties: { semanticRole: role } } : {}) };
}
function sidebar(block: LegacyBlock, where: string): Element[] {
  if (block.type !== "sidebar" || typeof block.title !== "string" || (block.body !== undefined && !strings(block.body))) return bad(where, "invalid sidebar title or body");
  onlyKeys(block as unknown as Record<string, unknown>, ["type", "title", "body"], where);
  const title = text("sidebar", `**${block.title}**`, "aside");
  title.properties!.keepWithNext = true;
  return [title, ...(block.body ?? []).map(value => text("sidebar", value, "aside"))];
}
function list(items: string[], ordered: boolean, notes = false): Element {
  return {
    type: "list", content: "", list: { kind: ordered ? "ordered" : "unordered", indent: 10, itemSpacing: 3 },
    ...(notes ? { properties: { semanticRole: "notes", style: { fontSize: 6 } } } : {}),
    children: items.map((item, index) => {
      const result = text("list-item", item, notes ? "note" : undefined);
      if (notes) result.properties!.noteNumber = index + 1;
      return result;
    }),
  };
}
function table(columns: string[], rows: (string | number)[][], motivation = false): Element {
  if (!columns.length || rows.some(row => row.length !== columns.length)) throw new Error("table rows must match a nonempty column list");
  return {
    type: "table", content: "",
    table: {
      headerRows: 1, repeatHeader: true,
      columns: columns.map((_, index) => motivation && index === 0 ? { mode: "fixed", value: bookTheme.table.motivationFirstColumnWidth } : { mode: "flex", fr: 1 }),
      headerCellStyle: bookTheme.table.headerCellStyle,
    },
    children: [columns, ...rows].map((row, rowIndex) => ({
      type: "table-row", content: "", ...(rowIndex === 0 ? { properties: { semanticRole: "header" } } : {}),
      children: row.map((value, index) => {
        const cell = text("table-cell", String(value));
        if (motivation && index === 0) cell.properties = { style: bookTheme.table.motivationCellStyle };
        return cell;
      }),
    })),
  };
}
function convert(block: LegacyBlock, where: string): Element[] {
  if (!object(block) || typeof block.type !== "string") return bad(where, "expected a block with a type");
  const type = block.type;
  const fields: Record<string, string[]> = {
    sidebar: ["type", "title", "body"], table: ["type", "columns", "rows", "style"],
    statblock: ["type", "name", "kind", "desc", "chars", "derived", "fields"],
    list: ["type", "items"], procedure: ["type", "title", "steps"], endnotes: ["type", "title", "items"],
    p: ["type", "text", "style", "sidebar"], h2: ["type", "text"], h3: ["type", "text"],
    h4: ["type", "text"], scenario: ["type", "text"], readaloud: ["type", "text"],
    synopsis: ["type", "text"], example: ["type", "text"],
  };
  if (!fields[type]) return bad(where, `unsupported legacy block type ${type}`);
  onlyKeys(block as unknown as Record<string, unknown>, fields[type], where);
  if (type === "sidebar") return sidebar(block, where);
  if (type === "table") {
    if (!strings(block.columns) || !Array.isArray(block.rows) || block.rows.some(row => !Array.isArray(row) || row.some(cell => typeof cell !== "string" && typeof cell !== "number"))) return bad(where, "invalid table columns or rows");
    // `gear` was the legacy renderer's explicit name for the default table presentation.
    if (block.style !== undefined && block.style !== "motiv" && block.style !== "gear") return bad(where, `unknown table style ${block.style}`);
    const result = table(block.columns, block.rows, block.style === "motiv"); result.columnSpan = "all"; return [result];
  }
  if (type === "statblock") {
    if (block.name !== undefined && typeof block.name !== "string" || block.kind !== undefined && typeof block.kind !== "string" || block.desc !== undefined && typeof block.desc !== "string") return bad(where, "invalid adversary name, kind, or description");
    const relabel = (values: Record<string, string | number> | undefined, labels: Record<string, string>) => {
      if (values === undefined) return undefined;
      if (!object(values) || Object.values(values).some(value => typeof value !== "string" && typeof value !== "number")) return bad(where, "invalid adversary metrics");
      return Object.fromEntries(Object.entries(values).map(([key, value]) => [labels[key] ?? key, value]));
    };
    if (block.fields !== undefined && (!Array.isArray(block.fields) || block.fields.some(field => !object(field) || field.label !== undefined && typeof field.label !== "string" || field.text !== undefined && typeof field.text !== "string"))) return bad(where, "invalid adversary fields");
    // The adversary layout is owned by the shared composition, so migrated and newly authored profiles cannot diverge.
    return composeAdversary({
      name: block.name ?? "", kind: block.kind, description: block.desc,
      characteristics: relabel(block.chars, chars), derived: relabel(block.derived, derived),
      fields: (block.fields ?? []).map(field => ({ label: field.label, text: field.text ?? "" })),
    });
  }
  if (type === "list" || type === "procedure" || type === "endnotes") {
    const values = type === "procedure" ? block.steps : block.items;
    if (!strings(values)) return bad(where, `${type} requires an array of strings`);
    if (type === "list") return [list(values, false)];
    if (type === "procedure") {
      if (typeof block.title !== "string") return bad(where, "procedure requires a title");
      return [text("h4", block.title, "heading"), list(values, true)];
    }
    if (block.title !== undefined && typeof block.title !== "string") return bad(where, "invalid notes title");
    const heading = text("h4", block.title ?? "Notes", "notes");
    heading.columnSpan = "all"; heading.properties!.style = { fontSize: 6 };
    const notes = list(values, true, true); notes.columnSpan = "all";
    return [heading, notes];
  }
  if (!["p", "h2", "h3", "h4", "scenario", "readaloud", "synopsis", "example"].includes(type)) return bad(where, `unsupported legacy block type ${type}`);
  if (typeof block.text !== "string") return bad(where, `${type} requires text`);
  if (block.style !== undefined && (type !== "p" || !["body", "lead", "small", "deriv", "act", "chk", "opening"].includes(block.style))) return bad(where, `unsupported ${type} style ${block.style}`);
  const elementType = type === "p" && block.style && block.style !== "body" ? block.style : type;
  const role = type === "h4" ? "subheading" : ["h2", "h3", "scenario"].includes(type) ? "heading" : undefined;
  const value = (type === "synopsis" ? "**Synopsis.** " : "") + block.text;
  const anchors = value.split("{{sidebar}}");
  let result: Element[];
  if (block.sidebar !== undefined || anchors.length !== 1) {
    if (type !== "p" || anchors.length !== 2 || !block.sidebar) return bad(where, "anchored sidebar requires one marker and one sidebar on a paragraph");
    result = [...(anchors[0] ? [text(elementType, anchors[0], role)] : []), ...sidebar(block.sidebar, `${where}.sidebar`), ...(anchors[1] ? [text(elementType, anchors[1], role)] : [])];
  } else {
    // A blank line inside one legacy block is an authored paragraph break; keep each paragraph a distinct native element.
    const paragraphs = value.split(/\n[ \t]*\n/).map(part => part.trim()).filter(Boolean);
    if (!paragraphs.length) return bad(where, `${type} text is empty`);
    if (paragraphs.length > 1 && role) return bad(where, `${type} heading contains a paragraph break`);
    result = paragraphs.map(part => text(elementType, part, role));
  }
  if (type === "h2" || type === "scenario" || type === "p" && block.style === "opening") for (const element of result) element.columnSpan = "all";
  return result;
}

/** Migrate a parsed legacy document. Source IDs are persisted in the output. */
export function migrateLegacy(value: unknown): { meta: unknown; elements: Element[] } {
  if (!object(value) || !object(value.meta) || !Array.isArray(value.chapters) || value.elements !== undefined) return bad("document", "expected unambiguous legacy meta and chapters");
  onlyKeys(value, ["meta", "chapters"], "document");
  const elements: Element[] = [];
  const used = new Map<string, number>();
  const chapters = new Set<string>();
  const bookTitles = Object.keys(audioGroups);
  const isCompleteBook = value.chapters.length === bookTitles.length && value.chapters.every((entry, index) => object(entry) && entry.title === bookTitles[index]);
  function identify(element: Element, scope: string): void {
    const description = element.content + (element.children ?? []).filter(child => child.type === "text").map(child => child.content).join(" ");
    const raw = `${scope}|${element.type}|${description}|${element.properties?.semanticRole ?? ""}`;
    const digest = createHash("sha256").update(raw).digest("hex").slice(0, 12);
    const slug = description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36).replace(/-$/, "") || element.type;
    const base = `${slug === "toc" || slug.startsWith("toc-") ? "authored-" : ""}${slug}-${digest}`;
    const count = (used.get(base) ?? 0) + 1; used.set(base, count);
    element.properties = { ...element.properties, sourceId: `${base}${count > 1 ? `-${count}` : ""}` };
    for (const child of element.children ?? []) identify(child, `${scope}|${base}`);
  }
  for (const [index, entry] of value.chapters.entries()) {
    const where = `chapters[${index}]`;
    if (!object(entry) || typeof entry.title !== "string" || !entry.title.trim() || !Array.isArray(entry.blocks)) return bad(where, "requires a title and blocks array");
    onlyKeys(entry, ["title", "part", "blocks"], where);
    const chapter = entry as unknown as LegacyChapter;
    if (chapters.has(chapter.title)) return bad(where, `duplicate chapter title ${chapter.title} is ambiguous`);
    chapters.add(chapter.title);
    if (chapter.part !== undefined) {
      if (!object(chapter.part) || typeof chapter.part.title !== "string" || !chapter.part.title || chapter.part.label !== undefined && typeof chapter.part.label !== "string") return bad(where, "invalid part");
      onlyKeys(chapter.part as unknown as Record<string, unknown>, ["label", "title"], `${where}.part`);
      if (/[*[\]{}]/.test(chapter.part.title) || (chapter.part.label && /[*[\]{}]/.test(chapter.part.label))) return bad(where, "part label and title must be plain text");
      const label = chapter.part.label ?? "", title = chapter.part.title;
      const part = text("h1", `${label ? `${label}: ` : ""}${title}`, "part");
      part.properties = { ...part.properties, partLabel: label, partTitle: title };
      identify(part, `${chapter.title}|part`);
      const originalId = part.children![0].properties!.sourceId;
      part.children = [...(label ? [{ type: "text", content: `${label}\n`, properties: { sourceId: `${originalId}-label`, style: { fontSize: 12 } } }] : []), { type: "text", content: title, properties: { sourceId: `${originalId}-title` } }];
      part.properties!.style = { pageBreakBefore: true, textAlign: "center", marginTop: 140, fontSize: 26 };
      elements.push(part);
    }
    const heading = text("h1", chapter.title, "chapter");
    identify(heading, `${chapter.title}|chapter`);
    heading.properties!.style = { pageBreakBefore: true };
    if (isCompleteBook) heading.properties!.audioPart = audioGroups[chapter.title];
    elements.push(heading);
    let afterHeading = true;
    const children: Element[] = [];
    chapter.blocks.forEach((block, blockIndex) => {
      const converted = convert(block, `${where}.blocks[${blockIndex}]`);
      if (block.type === "p" && afterHeading) for (const element of converted) element.columnSpan = "all";
      afterHeading = block.type === "h2";
      children.push(...converted);
    });
    const story: Element = { type: "story", content: "", columns: 2, gutter: bookTheme.geometry.columnGap, balance: false, children };
    identify(story, `${chapter.title}|story`); elements.push(story);
  }
  return { meta: value.meta, elements };
}

async function main(): Promise<void> {
  const [input, output, ...extra] = process.argv.slice(2);
  if (!input || !output || extra.length) throw new Error("Usage: bun tools/migrate-vmprint.ts INPUT.yaml OUTPUT.yaml");
  const original = await readFile(input, "utf8");
  const parsed: unknown = parse(original);
  if (!object(parsed)) throw new Error(`${input}: expected a YAML document object`);
  const native = Array.isArray(parsed.elements) && !Object.hasOwn(parsed, "chapters");
  // Shared in-memory style objects must be persisted as independent YAML nodes, never aliases.
  const contents = native ? original : stringify(migrateLegacy(parsed), { lineWidth: 110, aliasDuplicateObjects: false });
  const sameFile = resolve(input) === resolve(output);
  if (native && sameFile) return;
  await writeFile(output, contents, sameFile ? undefined : { flag: "wx" });
}
if (import.meta.main) main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
