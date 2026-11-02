import { expect, test } from "bun:test";
import { loadDocument, VMPrintEngine, type DocumentInput } from "@vmprint/engine";
import { fontManager } from "../src/templates/document";

// The npm release labelled 1.4.0 does not expose this revision's native list actor.
test("the pinned VMPrint revision lays out numbered list items and continuation markers", async () => {
  const input: DocumentInput = {
    documentVersion: "1.1",
    layout: { pageSize: { width: 300, height: 220 }, margins: { top: 20, right: 20, bottom: 20, left: 20 }, fontFamily: "Libre Baskerville", fontSize: 8, lineHeight: 1.4 },
    styles: { "list-item": { allowLineSplit: true } },
    elements: [{
      type: "list", content: "", list: { kind: "ordered", start: 3, indent: 20, markerWidth: 12, markerGap: 4 },
      children: [
        { type: "list-item", content: Array(300).fill("continued").join(" "), properties: { sourceId: "long-item" } },
        { type: "list-item", content: "Next item", properties: { sourceId: "next-item" } },
      ],
    }],
  };
  const pages = await new VMPrintEngine(loadDocument(input, "native-list"), fontManager(process.cwd())).layout();
  const boxes = pages.flatMap(page => page.boxes);
  const markers = boxes.filter(box => box.properties?._listMarker).map(box => (box.lines ?? []).flatMap(line => line.map(run => run.text)).join(""));
  expect(pages.length).toBeGreaterThan(1);
  expect(markers).toEqual(["3.", "4."]);
  expect(boxes.filter(box => box.meta?.sourceId === "author:long-item").length).toBeGreaterThan(1);
});
