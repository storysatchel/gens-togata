import { expect, test } from "bun:test";
import type { DocumentData } from "../src/content/types";
import { layoutDocument, sourcePages } from "../src/output/pdf";
import { contentsEntries } from "../src/templates/document";
import { PAGE_MARGIN } from "../src/templates/styles";

const tokens = (prefix: string, count: number) => Array.from({ length: count }, (_, index) => `${prefix}${index}`);

test("rich paragraphs and anchored sidebar paragraphs survive column and page continuations exactly once", async () => {
  const words = tokens("word", 700);
  const side = tokens("side", 500);
  const callout = tokens("callout", 300);
  const document: DocumentData = {
    meta: { title: "Layout proof", subtitle: "", tagline: "", system: "Genesys", legal: ["Legal page"] },
    chapters: [{ title: "First", blocks: [
      { type: "h3", text: "Column flow" },
      { type: "p", text: `${words.slice(0, 220).join(" ")} {{sidebar}} ${words.slice(220).join(" ")}`, sidebar: { type: "sidebar", title: "Anchored sidebar", body: [side.slice(0, 170).join(" "), side.slice(170, 350).join(" "), side.slice(350).join(" ")] } },
      { type: "h3", text: "Continuation target" },
      { type: "h2", text: "Full-width division" },
      { type: "p", text: tokens("following", 100).join(" ") },
      { type: "readaloud", text: callout.join(" ") },
      { type: "p", style: "body", text: "A **bold** conclusion." },
    ] }, { title: "Second", blocks: [{ type: "p", text: "Second chapter body." }] }],
  };
  const { pages } = await layoutDocument(document, process.cwd());
  const rendered = pages.flatMap(page => page.boxes.flatMap(box => box.lines ?? []).flatMap(line => line.map(run => run.text))).join(" ");
  expect(Array.from(rendered.match(/word\d+/g) ?? [])).toEqual(words);
  expect(Array.from(rendered.match(/side\d+/g) ?? [])).toEqual(side);
  expect(Array.from(rendered.match(/callout\d+/g) ?? [])).toEqual(callout);
  expect(rendered).not.toContain("{{sidebar}}");
  const targets = sourcePages(pages);
  for (const entry of contentsEntries(document)) expect(targets.has(entry.id)).toBe(true);
  const chapterPage = pages[targets.get("chapter-1")! - 1]!;
  expect(chapterPage.boxes.filter(box => box.type !== "footer")[0]?.meta?.sourceId).toBe("author:chapter-1");
  for (const page of pages) {
    for (const box of page.boxes) {
      if (!box.lines?.length || box.type === "footer") continue;
      expect(box.y + box.h).toBeLessThanOrEqual(page.height - PAGE_MARGIN.bottom + 0.01);
    }
    const heading = page.boxes.find(box => box.meta?.sourceId === "author:block-0-3");
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
