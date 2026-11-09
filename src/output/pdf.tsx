import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { render } from "takumi-pdf";
import { PageNumber } from "takumi-pdf/primitives";
import type { DocumentData } from "../content/types";
import { DocumentTemplate, documentAssets } from "../templates/Document";
import { PAGE_MARGIN, PAGE_SIZE } from "../templates/page";

export async function writePdf(document: DocumentData, root: string, outputPath: string): Promise<void> {
  const assets = await documentAssets(root, document);
  const node = await DocumentTemplate({ document, root, assets });
  const pdf = await render(node, {
    size: PAGE_SIZE,
    margin: { top: PAGE_MARGIN.top, right: 0, bottom: PAGE_MARGIN.bottom, left: 0 },
    footer: <div className="page-footer">Page <PageNumber /></div>,
    pages: { first: { footer: false } },
    fonts: assets.fonts,
    images: assets.images,
    fontFamilies: assets.fontFamilies,
    outline: true,
    lang: "en",
    metadata: { title: document.meta.title, description: document.meta.subtitle, creator: "Gens Togata renderer" },
  });
  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, pdf);
  console.log(`PDF -> ${outputPath} (${pdf.byteLength} bytes)`);
}
