import { PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import type { Page } from "@vmprint/engine";
import type { DocumentData } from "../content/types";
import { contentsEntries } from "../templates/document";

// VMPrint owns geometry and the contents page; this only adds PDF metadata and bookmarks, which it does not provide.
export async function finishPdf(bytes: Uint8Array, document: DocumentData, layout: Page[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes);
  pdf.setTitle(document.meta.title);
  pdf.setSubject(document.meta.subtitle);
  pdf.setCreator("Gens Togata / VMPrint");
  pdf.setLanguage("en");
  const pages = pdf.getPages();
  const entries = contentsEntries(document);
  const boxes = layout.flatMap(page => page.boxes.map(box => ({ page, box, id: box.meta?.sourceId.replace(/^author:/, "") })));
  const root = pdf.context.obj({ Type: "Outlines", Count: entries.length });
  const rootRef = pdf.context.register(root);
  const outlines = entries.map(entry => {
    const target = boxes.find(({ id }) => id === entry.id);
    if (!target) throw new Error(`Missing PDF destination: ${entry.id}`);
    const destination = pdf.context.obj([pages[target.page.index]!.ref, "XYZ", null, target.page.height - target.box.y, null]);
    const node = pdf.context.obj({ Title: PDFHexString.fromText(entry.label), Parent: rootRef, Dest: destination });
    return { node, ref: pdf.context.register(node) };
  });
  outlines.forEach(({ node }, index) => {
    if (index > 0) node.set(PDFName.of("Prev"), outlines[index - 1]!.ref);
    if (index + 1 < outlines.length) node.set(PDFName.of("Next"), outlines[index + 1]!.ref);
  });
  if (outlines.length) {
    root.set(PDFName.of("First"), outlines[0]!.ref);
    root.set(PDFName.of("Last"), outlines.at(-1)!.ref);
    pdf.catalog.set(PDFName.of("Outlines"), rootRef);
  }
  return pdf.save();
}
