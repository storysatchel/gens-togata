import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DocumentInput, Element } from "@vmprint/engine";
import LocalFontManager from "@vmprint/local-fonts";
import type { DocumentData } from "../content/types";
import { bookTheme } from "./styles";

export interface ContentsEntry { id: string; label: string; level: number }

/** Visit source elements in authored reading order, including native spatial containers. */
export function* walkElements(elements: readonly Element[]): Generator<Element> {
  for (const element of elements) {
    yield element;
    if (element.children) yield* walkElements(element.children);
  }
}

export function elementText(element: Element): string {
  return element.children?.length ? element.children.map(elementText).join("") : element.content;
}

export function contentsEntries(document: DocumentData): ContentsEntry[] {
  const entries: ContentsEntry[] = [];
  for (const element of walkElements(document.elements)) {
    const role = element.properties?.semanticRole;
    if (role !== "part" && role !== "chapter" && role !== "heading") continue;
    const id = element.properties?.sourceId as string;
    const label = role === "part" && typeof element.properties?.partTitle === "string"
      ? `${element.properties.partLabel ? `${element.properties.partLabel}: ` : ""}${element.properties.partTitle}`
      : elementText(element);
    entries.push({ id, label, level: role === "part" ? 0 : role === "chapter" ? 1 : 2 });
  }
  return entries;
}

export function fontManager(root: string): LocalFontManager {
  const source = (family: string, file: string, weight = 400, style: "normal" | "italic" = "normal") => ({ name: `${family} ${weight} ${style}`, family, weight, style, src: resolve(root, file), enabled: true, fallback: family === "DejaVu Sans" });
  return new LocalFontManager({ fonts: [
    source("Libre Baskerville", "node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff"),
    source("Libre Baskerville", "node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff", 700),
    source("Libre Baskerville", "node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-italic.woff", 400, "italic"),
    source("Genesys", "assets/fonts/GenesysGlyphsAndDice-3.0.ttf"),
    source("DejaVu Sans", "node_modules/@fontsource/dejavu-sans/files/dejavu-sans-latin-400-normal.woff"),
  ] });
}
const text = (type: string, content: string): Element => ({ type, content });
const pageStart = (element: Element): Element => ({ ...element, properties: { ...element.properties, style: { ...element.properties?.style, pageBreakBefore: true } } });

export async function documentInput(document: DocumentData, root: string, pageNumbers: ReadonlyMap<string, number> = new Map()): Promise<DocumentInput> {
  const meta = document.meta;
  const cover = await readFile(resolve(root, "assets/cover-festoon.png"));
  const elements: Element[] = [
    { type: "image", content: "", image: { data: cover.toString("base64"), mimeType: "image/png", fit: "contain" }, properties: { style: { width: bookTheme.geometry.contentWidth, height: 130, marginTop: 30 } } },
    text("cover-title", meta.title), text("cover-subtitle", meta.subtitle), text("cover-tagline", `“${meta.tagline}”`), text("cover-system", meta.system.toUpperCase()),
    ...meta.legal.map((paragraph, i) => i === 0 ? pageStart(text("legal", paragraph)) : text("legal", paragraph)),
    pageStart(text("h1", "Contents")),
  ];
  for (const entry of contentsEntries(document)) {
    elements.push({ type: "table", content: "", table: { columns: [{ mode: "flex", fr: 1 }, { mode: "fixed", value: 25 }], cellStyle: { borderBottomWidth: 0, padding: 2 } }, children: [{ type: "table-row", content: "", children: [
      { type: "table-cell", content: entry.label, properties: { sourceId: `toc-${entry.id}`, style: { marginLeft: entry.level * 9, fontSize: entry.level === 2 ? 6 : 7, fontWeight: entry.level < 2 ? 700 : 400 } } },
      { type: "table-cell", content: String(pageNumbers.get(entry.id) ?? ""), properties: { sourceId: `toc-page-${entry.id}`, style: { textAlign: "right", fontSize: 7 } } },
    ] }] });
  }
  const authored = structuredClone(document.elements);
  for (const element of walkElements(authored)) {
    const props = element.properties ?? {};
    // Book semantics used by narration and validation are not VMPrint property keys.
    for (const key of ["audioPart", "partLabel", "partTitle", "noteNumber"]) delete props[key];
    const role: string = props.semanticRole ?? "";
    const [kind, name = ""] = role.split(":");
    const style = role === "keyword" ? bookTheme.keyword : role === "note-ref" ? bookTheme.note
      : kind === "dice" || kind === "result" ? { ...bookTheme.glyph, ...(kind === "dice" ? { color: bookTheme.colors.dice[name as keyof typeof bookTheme.colors.dice] } : {}) } : undefined;
    if (style) element.properties = { ...props, style: { ...props.style, ...style } };
    if (role === "stat-metrics") for (const row of element.children ?? []) for (const cell of row.children ?? []) {
      cell.properties = { ...cell.properties, style: { ...bookTheme.statCell, ...cell.properties?.style } };
    }
  }
  // The pinned engine overlaps a full-width child with the preceding column, so each band becomes its own root element.
  for (const story of authored) {
    if (story.type !== "story") { elements.push(story); continue; }
    let run: Element[] = [];
    let pieces = 0;
    const flush = () => {
      if (run.length) elements.push({ ...story, children: run, properties: { ...story.properties, sourceId: `${story.properties?.sourceId}${pieces++ ? `--segment-${pieces}` : ""}` } });
      run = [];
    };
    for (const child of story.children ?? []) {
      if (child.columnSpan !== "all") { run.push(child); continue; }
      flush();
      delete child.columnSpan;
      elements.push(child);
    }
    flush();
  }
  return {
    documentVersion: "1.1",
    layout: { pageSize: bookTheme.geometry.pageSize, margins: bookTheme.geometry.margins, ...bookTheme.typography, footerInsetTop: 12, pageNumberStart: 1 },
    styles: bookTheme.styles, elements,
    footer: { firstPage: null, default: { elements: [{ type: "footer", content: "Page {physicalPageNumber}" }] } },
  };
}
