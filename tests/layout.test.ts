import { expect, test } from "bun:test";
import type { DocumentData } from "../src/content/types";
import { layoutDocument, sourcePages } from "../src/output/pdf";
import { contentsEntries } from "../src/templates/document";
import { bookTheme } from "../src/templates/styles";

const tokens = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}${index}`);

test("native stories preserve content across columns and resolve heading destinations", async () => {
  const words = tokens("word", 700);
  const side = tokens("side", 500);
  const callout = tokens("callout", 300);
  const document: DocumentData = {
    meta: { title: "Layout proof", subtitle: "", tagline: "", system: "Genesys", legal: ["Legal page"] },
    elements: [
      { type: "h1", content: "First", properties: { sourceId: "first", semanticRole: "chapter", style: { pageBreakBefore: true } } },
      { type: "story", content: "", columns: 2, gutter: 12, children: [
        { type: "h3", content: "Column flow", properties: { sourceId: "column-flow", semanticRole: "heading" } },
        { type: "p", content: words.slice(0, 220).join(" ") },
        { type: "sidebar", content: side.join(" "), properties: { semanticRole: "aside" } },
        { type: "p", content: words.slice(220).join(" ") },
        { type: "h2", content: "Full-width division", columnSpan: "all", properties: { sourceId: "full-division", semanticRole: "heading" } },
        { type: "p", content: tokens("following", 100).join(" ") },
        { type: "readaloud", content: callout.join(" ") },
      ] },
      { type: "h1", content: "Second", properties: { sourceId: "second", semanticRole: "chapter", style: { pageBreakBefore: true } } },
      { type: "p", content: "Second chapter body." },
    ],
  };
  const { pages } = await layoutDocument(document, process.cwd());
  const rendered = pages.flatMap(page => page.boxes.flatMap(box => box.lines ?? []).flatMap(line => line.map(run => run.text))).join(" ");
  expect(Array.from(rendered.match(/word\d+/g) ?? [])).toEqual(words);
  expect(Array.from(rendered.match(/side\d+/g) ?? [])).toEqual(side);
  expect(Array.from(rendered.match(/callout\d+/g) ?? [])).toEqual(callout);
  const targets = sourcePages(pages);
  for (const entry of contentsEntries(document)) expect(targets.has(entry.id)).toBe(true);
  const chapterPage = pages[targets.get("second")! - 1]!;
  expect(chapterPage.boxes.filter(box => box.type !== "footer")[0]?.meta?.sourceId).toBe("author:second");
  for (const page of pages) {
    for (const box of page.boxes) {
      if (!box.lines?.length || box.type === "footer") continue;
      expect(box.y + box.h).toBeLessThanOrEqual(page.height - bookTheme.geometry.margins.bottom + 0.01);
    }
    const heading = page.boxes.find(box => box.meta?.sourceId === "author:full-division");
    if (!heading) continue;
    for (const box of page.boxes) {
      if (box === heading || !box.lines?.length) continue;
      expect(box.y + box.h <= heading.y + 0.01 || box.y >= heading.y + heading.h - 0.01).toBe(true);
    }
  }
  for (const entry of contentsEntries(document)) {
    const number = pages.flatMap(page => page.boxes).filter(box => box.meta?.sourceId === `author:toc-page-${entry.id}`).flatMap(box => box.lines ?? []).flatMap(line => line.map(run => run.text)).join("").trim();
    expect(number).toBe(String(targets.get(entry.id)));
  }
});
