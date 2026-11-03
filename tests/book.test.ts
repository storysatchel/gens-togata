import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { PDFDocument, PDFDict, PDFName } from "pdf-lib";
import { loadDocument } from "../src/content/load";
import { layoutDocument, sourcePages, writePdf } from "../src/output/pdf";
import { contentsEntries, elementText, walkElements } from "../src/templates/document";
import { bookTheme } from "../src/templates/styles";

const whitespace = (value: string) => value.replace(/\s/g, "");
const containers: Record<string, true> = { story: true, table: true, "table-row": true, "table-cell": true, list: true, text: true };
const expectedLaidOutText = (element: any): string => {
  if (element.children?.length) return element.children.map(expectedLaidOutText).join("");
  const text = element.content ?? "";
  return element.properties?.semanticRole === "keyword" ? text.toUpperCase() : text;
};

for (const file of ["content.yaml", "styleguide.yaml"]) {
  test(`${file}: every authored element is laid out exactly once, inside the margins, with resolved navigation`, async () => {
    const document = await loadDocument(file);
    const { pages } = await layoutDocument(document, process.cwd());
    const laidOut = new Map<string, string>();
    const { margins, pageSize } = bookTheme.geometry;
    for (const page of pages) for (const box of page.boxes) {
      if (!box.lines?.length || box.type === "footer") continue;
      const id = box.meta?.sourceId.replace(/^author:/, "") ?? "";
      laidOut.set(id, (laidOut.get(id) ?? "") + box.lines.flat().map(run => run.text).join(""));
      expect(box.x).toBeGreaterThanOrEqual(margins.left - 0.1);
      expect(box.x + box.w).toBeLessThanOrEqual(pageSize.width - margins.right + 0.1);
      expect(box.y).toBeGreaterThanOrEqual(margins.top - 0.1);
      expect(box.y + box.h).toBeLessThanOrEqual(pageSize.height - margins.bottom + 0.1);
    }
    const wrong: string[] = [];
    for (const element of walkElements(document.elements)) {
      const id = element.properties?.sourceId;
      if (!id || containers[element.type]) continue;
      const expected = whitespace(expectedLaidOutText(element));
      if (expected && whitespace(laidOut.get(id) ?? "") !== expected) wrong.push(id);
    }
    expect(wrong).toEqual([]);
    const targets = sourcePages(pages);
    const toc = whitespace(pages.flatMap(page => page.boxes)
      .filter(box => box.meta?.sourceId === "author:contents")
      .flatMap(box => box.lines ?? []).flat().map(run => run.text).join(""));
    let cursor = 0;
    const source = new Map([...walkElements(document.elements)].map(element => [element.properties?.sourceId, element]));
    for (const entry of contentsEntries(document)) {
      const page = targets.get(entry.id);
      expect(page).toBeDefined();
      const label = whitespace(elementText(source.get(entry.id)!));
      const position = toc.indexOf(`${label}${page}`, cursor);
      expect(position).toBeGreaterThanOrEqual(cursor);
      cursor = position + label.length + String(page).length;
    }
    // Full-width headings must not share vertical space with column text.
    for (const page of pages) for (const band of page.boxes.filter(box => box.lines?.length && ["h1", "h2", "scenario"].includes(box.type))) {
      for (const box of page.boxes) if (box !== band && box.lines?.length && box.type !== "footer") {
        expect(box.y + box.h <= band.y + 0.01 || box.y >= band.y + band.h - 0.01).toBe(true);
      }
    }
    // Sidebars float within story columns and have columnar prose flowing around them.
    const asides = pages.flatMap(page => page.boxes.filter(box => box.lines?.length && box.type === "sidebar"));
    expect(asides.length).toBeGreaterThan(0);
    expect(asides.every(aside => aside.w < bookTheme.geometry.contentWidth / 2)).toBe(true);
  });
}

test("styleguide PDF carries a bookmark for every contents entry", async () => {
  const dir = await mkdtemp(`${tmpdir()}/book-pdf-`);
  try {
    const document = await loadDocument("styleguide.yaml");
    await writePdf(document, process.cwd(), `${dir}/guide.pdf`);
    const pdf = await PDFDocument.load(await readFile(`${dir}/guide.pdf`));
    const entries = contentsEntries(document).length;
    expect(pdf.catalog.lookup(PDFName.of("Outlines"), PDFDict).get(PDFName.of("Count"))?.toString()).toBe(String(entries));
    expect(pdf.getTitle()).toBe(document.meta.title);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
