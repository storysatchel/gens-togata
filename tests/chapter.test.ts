import { expect, test } from "bun:test";
import { layoutDocument, sourcePages } from "../src/output/pdf";

test("a full-width division can follow the chapter introduction without a forced blank remainder", async () => {
  const { pages } = await layoutDocument({
    meta: { title: "Continuity proof", subtitle: "", tagline: "", system: "Genesys", legal: ["Legal"] },
    elements: [
      { type: "h1", content: "Chapter", properties: { sourceId: "chapter", semanticRole: "chapter", style: { pageBreakBefore: true } } },
      { type: "lead", content: Array(60).fill("Introduction").join(" ") },
      { type: "story", content: "", columns: 2, gutter: 12, children: [
        { type: "h2", content: "Division", columnSpan: "all", properties: { sourceId: "division", semanticRole: "heading" } },
        { type: "sidebar", content: Array(500).fill("Body").join(" ") },
      ] },
    ],
  }, process.cwd());
  const targets = sourcePages(pages);
  expect(targets.get("division")).toBe(targets.get("chapter"));
});
