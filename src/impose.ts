// Booklet imposition: replaces pdfbook2.
// Lays out source pages 2-up on landscape letter sheets in saddle-stitched
// signatures, ordered for duplex printing with the short-edge flip setting.
//
// Usage: bun run src/impose.ts <input.pdf> <output.pdf> [--signature=16]
import { PDFDocument } from "pdf-lib";

const LETTER_LANDSCAPE: [number, number] = [792, 612];

/** Page order (0-based source indices, -1 = blank) for one signature of `n` pages, n % 4 === 0. */
export function signatureOrder(n: number): number[] {
  const order: number[] = [];
  for (let k = 0; k < n / 4; k++) {
    order.push(n - 1 - 2 * k, 2 * k); // front: left, right
    order.push(2 * k + 1, n - 2 - 2 * k); // back: left, right
  }
  return order;
}

/** Full imposed order for `pages` source pages split into signatures of `signature` pages. */
export function bookletOrder(pages: number, signature: number): number[] {
  const order: number[] = [];
  for (let start = 0; start < pages; start += signature) {
    const size = Math.min(signature, Math.ceil((pages - start) / 4) * 4);
    for (const i of signatureOrder(size)) order.push(start + i < pages ? start + i : -1);
  }
  return order;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const sigArg = args.find((a) => a.startsWith("--signature="));
  const [input, output] = args.filter((a) => !a.startsWith("--"));
  if (!input || !output) throw new Error("usage: impose.ts <input.pdf> <output.pdf> [--signature=N]");
  const signature = sigArg ? Number(sigArg.split("=")[1]) : 16;
  if (!Number.isInteger(signature) || signature <= 0 || signature % 4 !== 0) {
    throw new Error(`--signature must be a positive multiple of 4, got ${sigArg}`);
  }

  const src = await PDFDocument.load(await Bun.file(input).arrayBuffer());
  const out = await PDFDocument.create();
  const embedded = await out.embedPdf(src, src.getPageIndices());
  const [sheetW, sheetH] = LETTER_LANDSCAPE;
  const cellW = sheetW / 2;

  const order = bookletOrder(src.getPageCount(), signature);
  for (let i = 0; i < order.length; i += 2) {
    const sheet = out.addPage(LETTER_LANDSCAPE);
    for (const [slot, idx] of [order[i], order[i + 1]].entries()) {
      if (idx === undefined || idx < 0) continue;
      const page = embedded[idx];
      const scale = Math.min(cellW / page.width, sheetH / page.height);
      const w = page.width * scale;
      const h = page.height * scale;
      sheet.drawPage(page, { x: slot * cellW + (cellW - w) / 2, y: (sheetH - h) / 2, width: w, height: h });
    }
  }
  await Bun.write(output, await out.save());
  console.log(`Folio -> ${output} (${order.length / 2} sides, ${order.length / 4} sheets, ${signature}-page signatures)`);
}

if (import.meta.main) await main();
