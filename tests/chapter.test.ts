import { expect, test } from "bun:test";
import { layoutDocument, sourcePages } from "../src/output/pdf";

test("a full-width division can follow the chapter introduction without a forced blank remainder", async () => {
  const { pages } = await layoutDocument({
    meta: { title: "Continuity proof", subtitle: "", tagline: "", system: "Genesys", legal: ["Legal"] },
    chapters: [{ title: "Chapter", blocks: [
      { type: "p", style: "lead", text: Array(60).fill("Introduction").join(" ") },
      { type: "h2", text: "Division" },
      { type: "sidebar", title: "Aside", body: [Array(500).fill("Body").join(" ")] },
    ] }],
  }, process.cwd());
  const targets = sourcePages(pages);
  expect(targets.get("block-0-1")).toBe(targets.get("chapter-0"));
});
