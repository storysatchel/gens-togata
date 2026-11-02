import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DocumentInput, Element } from "@vmprint/engine";
import LocalFontManager from "@vmprint/local-fonts";
import type { DocumentData } from "../content/types";
import { blocks, text } from "./blocks";
import { styles, PAGE_SIZE, PAGE_MARGIN, CONTENT_WIDTH, COLUMN_GAP } from "./styles";

export interface ContentsEntry { id: string; label: string; level: number }
export function contentsEntries(document: DocumentData): ContentsEntry[] {
  const entries: ContentsEntry[] = [];
  document.chapters.forEach((chapter, ci) => {
    if (chapter.part) entries.push({ id: `part-${ci}`, label: `${chapter.part.label ? `${chapter.part.label}: ` : ""}${chapter.part.title}`, level: 0 });
    entries.push({ id: `chapter-${ci}`, label: chapter.title, level: 1 });
    chapter.blocks.forEach((block, bi) => {
      if (["h2", "h3", "scenario"].includes(block.type) && "text" in block) entries.push({ id: `block-${ci}-${bi}`, label: block.text, level: 2 });
    });
  });
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
const pageStart = (element: Element): Element => ({ ...element, properties: { ...element.properties, style: { ...element.properties?.style, pageBreakBefore: true } } });
export async function documentInput(document: DocumentData, root: string, pageNumbers: ReadonlyMap<string, number> = new Map()): Promise<DocumentInput> {
  const meta = document.meta;
  const cover = await readFile(resolve(root, "assets/cover-festoon.png"));
  const elements: Element[] = [
    { type: "image", content: "", image: { data: cover.toString("base64"), mimeType: "image/png", fit: "contain" }, properties: { style: { width: CONTENT_WIDTH, height: 130, marginTop: 30 } } },
    text("cover-title", meta.title), text("cover-subtitle", meta.subtitle), text("cover-tagline", `“${meta.tagline}”`), text("cover-system", meta.system.toUpperCase()),
    ...meta.legal.map((paragraph, i) => i === 0 ? pageStart(text("legal", paragraph)) : text("legal", paragraph)),
    pageStart(text("h1", "Contents")),
  ];
  for (const entry of contentsEntries(document)) {
    elements.push({ type: "table", content: "", table: { columns: [{ mode: "flex", fr: 1 }, { mode: "fixed", value: 25 }], cellStyle: { borderBottomWidth: 0, padding: 2 } }, children: [{ type: "table-row", content: "", children: [
      { ...text("table-cell", entry.label), properties: { sourceId: `toc-${entry.id}`, style: { marginLeft: entry.level * 9, fontSize: entry.level === 2 ? 6 : 7, fontWeight: entry.level < 2 ? 700 : 400 } } },
      { ...text("table-cell", String(pageNumbers.get(entry.id) ?? "")), properties: { sourceId: `toc-page-${entry.id}`, style: { textAlign: "right", fontSize: 7 } } },
    ] }] });
  }
  document.chapters.forEach((chapter, ci) => {
    if (chapter.part) {
      elements.push(pageStart(text("part-label", chapter.part.label ?? "", `part-${ci}`)), text("part-title", chapter.part.title));
    }
    elements.push(pageStart(text("h1", chapter.title, `chapter-${ci}`)));
    let columnBlocks: Element[] = [];
    const flushColumns = () => {
      if (!columnBlocks.length) return;
      elements.push({ type: "story", content: "", columns: 2, gutter: COLUMN_GAP, balance: false, children: columnBlocks });
      columnBlocks = [];
    };
    let afterHeading = true;
    for (const [bi, block] of chapter.blocks.entries()) {
      const converted = blocks(block, `block-${ci}-${bi}`);
      if (block.type === "p" && afterHeading) for (const element of converted) element.columnSpan = "all";
      afterHeading = block.type === "h2";
      for (const element of converted) {
        if (element.columnSpan === "all") {
          flushColumns();
          delete element.columnSpan;
          elements.push(element);
        } else columnBlocks.push(element);
      }
    }
    flushColumns();
  });
  return {
    documentVersion: "1.1",
    layout: { pageSize: PAGE_SIZE, margins: PAGE_MARGIN, fontFamily: "Libre Baskerville", fontSize: 7, lineHeight: 1.4, lang: "en", footerInsetTop: 12, pageNumberStart: 1 },
    styles, elements,
    footer: { firstPage: null, default: { elements: [{ type: "footer", content: "Page {physicalPageNumber}" }] } },
  };
}
