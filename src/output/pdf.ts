import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { VMPrintEngine, loadDocument, type Page } from "@vmprint/engine";
import PdfContext from "@vmprint/context-pdf";
import type { DocumentData } from "../content/types";
import { contentsEntries, documentInput, fontManager } from "../templates/document";
import { bookTheme } from "../templates/styles";
import { finishPdf } from "./navigation";

export function sourcePages(pages: Page[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const page of pages) for (const box of page.boxes) {
    const id = box.meta?.sourceId.replace(/^author:/, "");
    if (id && !result.has(id)) result.set(id, page.index + 1);
  }
  return result;
}
export async function layoutDocument(document: DocumentData, root: string): Promise<{ engine: VMPrintEngine; pages: Page[] }> {
  const fonts = fontManager(root);
  const entries = contentsEntries(document);
  let numbers = new Map<string, number>();
  // TOC labels occupy fixed-width cells, so inserting page numbers cannot change their wrapping.
  for (let pass = 0; pass < 4; pass++) {
    const engine = new VMPrintEngine(loadDocument(await documentInput(document, root, numbers), "Gens Togata"), fonts);
    const pages = await engine.layout();
    // VMPrint omits empty viewports; preserve their physical sheets and destination indices.
    for (let index = 0; index < pages.length; index++) {
      if (pages[index]!.index > index) pages.splice(index, 0, { index, boxes: [], width: bookTheme.geometry.pageSize.width, height: bookTheme.geometry.pageSize.height });
    }
    const resolved = sourcePages(pages);
    for (const entry of entries) if (!resolved.has(entry.id)) throw new Error(`Missing contents target: ${entry.id}`);
    if (entries.every(entry => resolved.get(entry.id) === numbers.get(entry.id))) return { engine, pages };
    numbers = resolved;
  }
  throw new Error("Contents pagination did not settle");
}
export async function writePdf(document: DocumentData, root: string, outputPath: string): Promise<void> {
  const { engine, pages } = await layoutDocument(document, root);
  const chunks: Uint8Array[] = [];
  const { promise: completion, resolve: finish } = Promise.withResolvers<void>();
  const context = new PdfContext({ size: [bookTheme.geometry.pageSize.width, bookTheme.geometry.pageSize.height], margins: { top: 0, right: 0, bottom: 0, left: 0 }, autoFirstPage: false, bufferPages: false });
  context.pipe({ write: chunk => { chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk); }, end: finish, waitForFinish: () => completion });
  await engine.render(context);
  await completion;
  const pdf = await finishPdf(Buffer.concat(chunks), document, pages);
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, pdf);
  console.log(`PDF -> ${outputPath} (${pages.length} pages, ${pdf.byteLength} bytes)`);
}
