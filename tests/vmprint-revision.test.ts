import { expect, test } from "bun:test";
import { loadDocument, VMPrintEngine, type DocumentInput, type Element } from "@vmprint/engine";
import { fontManager } from "../src/templates/document";
import { bookTheme } from "../src/templates/styles";

// Declared in tools/patches/vmprint-story-continuation.patch: pourColumns used to emit a block that missed the last column twice.
test("the pinned patched revision never repeats a block that overflows a multi-column story onto the next page", async () => {
  const words = (count: number) => Array.from({ length: count }, (_, index) => `w${index}`).join(" ");
  for (const lead of [443, 446, 449, 452, 455]) {
    const children: Element[] = [{ type: "p", content: words(lead), properties: { sourceId: "lead" } }];
    for (let index = 0; index < 4; index++) {
      children.push({ type: "h3", content: `Head ${index}`, properties: { sourceId: `head-${index}` } });
      children.push({ type: "p", content: words(120), properties: { sourceId: `body-${index}` } });
    }
    const input: DocumentInput = {
      documentVersion: "1.1",
      layout: { pageSize: bookTheme.geometry.pageSize, margins: bookTheme.geometry.margins, ...bookTheme.typography },
      styles: bookTheme.styles,
      elements: [{ type: "story", content: "", columns: 2, gutter: 12, balance: false, children }],
    };
    const pages = await new VMPrintEngine(loadDocument(input, "story-overflow"), fontManager(process.cwd())).layout();
    const headings = pages.flatMap(page => page.boxes.filter(box => box.type === "h3").map(box => box.meta?.sourceId));
    expect(headings).toEqual(["author:head-0", "author:head-1", "author:head-2", "author:head-3"]);
    const text = (id: string) => pages.flatMap(page => page.boxes).filter(box => box.meta?.sourceId === `author:${id}`).flatMap(box => box.lines ?? []).flatMap(line => line.map(run => run.text)).join(" ");
    expect(text("lead").match(/w\d+/g)).toHaveLength(lead);
    for (let index = 0; index < 4; index++) expect(text(`body-${index}`).match(/w\d+/g)).toHaveLength(120);
  }
});
