import { VMPrintEngine, loadDocument, type Page } from "@vmprint/engine";
import PdfContext from "@vmprint/context-pdf";
import type { DocumentData } from "../content/types";
import { documentInput, fontManager } from "../templates/document";
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
  const engine = new VMPrintEngine(loadDocument(await documentInput(document, root), "Gens Togata"), fontManager(root));
  return { engine, pages: await engine.layout() };
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
  await Bun.write(outputPath, pdf);
  console.log(`PDF -> ${outputPath} (${pages.length} pages, ${pdf.byteLength} bytes)`);
}
