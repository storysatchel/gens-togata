import { expect, test } from "bun:test";
import { loadDocument } from "../src/content/load";
import { layoutDocument, sourcePages } from "../src/output/pdf";
import { contentsEntries, elementText, walkElements } from "../src/templates/document";
import { bookTheme } from "../src/templates/styles";

const whitespace = (value: string) => value.replace(/\s/g, "");
const containers: Record<string, true> = { story: true, table: true, "table-row": true, "table-cell": true, list: true, text: true };

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
      const expected = whitespace(elementText(element));
      if (expected && whitespace(laidOut.get(id) ?? "") !== expected) wrong.push(id);
    }
    expect(wrong).toEqual([]);
    const targets = sourcePages(pages);
    const tocText = (id: string) => pages.flatMap(page => page.boxes).filter(box => box.meta?.sourceId === `author:${id}`).flatMap(box => box.lines ?? []).flat().map(run => run.text).join("").trim();
    for (const entry of contentsEntries(document)) expect(tocText(`toc-page-${entry.id}`)).toBe(String(targets.get(entry.id)));
    // Full-width headings must not share vertical space with column text.
    for (const page of pages) for (const band of page.boxes.filter(box => box.lines?.length && ["h1", "h2", "scenario"].includes(box.type))) {
      for (const box of page.boxes) if (box !== band && box.lines?.length && box.type !== "footer") {
        expect(box.y + box.h <= band.y + 0.01 || box.y >= band.y + band.h - 0.01).toBe(true);
      }
    }
  });
}
