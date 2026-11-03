import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DocumentInput, Element } from "@vmprint/engine";
import LocalFontManager from "@vmprint/local-fonts";
import type { DocumentData } from "../content/types";
import { bookTheme } from "./styles";

export interface ContentsEntry { id: string; label: string }

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
    entries.push({ id, label });
  }
  return entries;
}

export function fontManager(root: string): LocalFontManager {
  const source = (family: string, file: string, weight = 400, style: "normal" | "italic" = "normal") => ({ name: `${family} ${weight} ${style}`, family, weight, style, src: resolve(root, file), enabled: true, fallback: false });
  return new LocalFontManager({ fonts: [
    source("Libre Baskerville", "node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff"),
    source("Libre Baskerville", "node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff", 700),
    source("Libre Baskerville", "node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-italic.woff", 400, "italic"),
    source("Genesys", "assets/fonts/GenesysGlyphsAndDice-3.0.ttf"),
  ] });
}
const text = (type: string, content: string): Element => ({ type, content });
const pageStart = (element: Element): Element => ({ ...element, properties: { ...element.properties, style: { ...element.properties?.style, pageBreakBefore: true } } });
const floatAside = (group: Element[]): Element => ({
  type: "story",
  content: "",
  placement: { mode: "float", align: "right", wrap: "around", gap: 4 },
  properties: { sourceId: `aside-float-${group[0]!.properties?.sourceId ?? "sidebar"}`, style: { width: 68 } },
  children: group,
});

export async function documentInput(document: DocumentData, root: string): Promise<DocumentInput> {
  const meta = document.meta;
  const cover = await readFile(resolve(root, "assets/cover-festoon.png"));
  const elements: Element[] = [
    { type: "image", content: "", image: { data: cover.toString("base64"), mimeType: "image/png", fit: "contain" }, properties: { style: { width: bookTheme.geometry.contentWidth, height: 130, marginTop: 30 } } },
    text("cover-title", meta.title), text("cover-subtitle", meta.subtitle), text("cover-tagline", `“${meta.tagline}”`), text("cover-system", meta.system.toUpperCase()),
    ...meta.legal.map((paragraph, i) => i === 0 ? pageStart(text("legal", paragraph)) : text("legal", paragraph)),
    pageStart({ type: "toc", content: "", properties: { sourceId: "contents", toc: { title: "Contents", semanticRoleFilter: ["part", "chapter", "heading"], style: { fontSize: 7, lineHeight: 1.6 } } } }),
  ];
  const authored = structuredClone(document.elements);
  for (const story of authored) {
    if (story.type !== "story" || !story.children) continue;
    const children: Element[] = [];
    let group: Element[] = [];
    for (const child of story.children) {
      if ((child.type === "sidebar" || child.properties?.semanticRole === "aside") && !child.placement) {
        group.push(child);
      } else {
        if (group.length) { children.push(floatAside(group)); group = []; }
        children.push(child);
      }
    }
    if (group.length) children.push(floatAside(group));
    story.children = children;
  }
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
  elements.push(...authored);
  return {
    documentVersion: "1.1",
    layout: { pageSize: bookTheme.geometry.pageSize, margins: bookTheme.geometry.margins, ...bookTheme.typography, footerInsetTop: 12, pageNumberStart: 1 },
    styles: bookTheme.styles, elements,
    footer: { firstPage: null, default: { elements: [{ type: "footer", content: "Page {physicalPageNumber}" }] } },
  };
}
