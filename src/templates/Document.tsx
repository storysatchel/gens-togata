import type { ReactNode } from "react";
import { measure, type MeasureOptions } from "takumi-pdf";
import { readFile } from "node:fs/promises";
import type { DocumentData } from "../content/types";
import { Inline } from "../inline/Inline";
import { Contents } from "./Contents";
import { Chapter } from "./Chapter";
import { Flow } from "./flow";
import { CONTENT_HEIGHT, CONTENT_WIDTH, PAGE_SIZE } from "./page";

export type DocumentAssets = Required<Pick<MeasureOptions, "fonts" | "images" | "fontFamilies">>;

export async function DocumentTemplate({ document, root, assets }: { document: DocumentData; root: string; assets: DocumentAssets }) {
  const css = await readFile(`${root}/styles.css`, "utf8");
  const m = document.meta;
  const options: MeasureOptions = { size: PAGE_SIZE, css, lang: "en", fonts: assets.fonts, images: assets.images, fontFamilies: assets.fontFamilies };
  const legal = <section className="legal-page">{m.legal.map((paragraph, i) => <p className="legal" key={i}><Inline text={paragraph} /></p>)}</section>;
  const contents = <Contents chapters={document.chapters} />;
  // Chapters start after the cover, the legal page, and the contents; the flow needs that page number to tell recto from verso.
  const pagesOf = async (node: ReactNode) => Math.max(1, Math.ceil((await measure(<div className="document" style={{ width: CONTENT_WIDTH }}>{node}</div>, options)).height / CONTENT_HEIGHT));
  const flow = new Flow(options, 1 + await pagesOf(legal) + await pagesOf(contents) + 1);
  const chapters = [];
  for (const [index, chapter] of document.chapters.entries()) chapters.push(await Chapter({ chapter, chapterIndex: index, flow }));
  return <>
    <style>{css}</style>
    <main className="document" style={{ padding: `0 18px` }}>
      <section className="cover">
        <img className="festoon" src="cover-festoon.png" alt="" />
        <h1 className="ptitle"><Inline text={m.title} /></h1>
        <div className="psub"><Inline text={m.subtitle} /></div><div className="ptag">“<Inline text={m.tagline} />”</div>
        <div className="psys"><Inline text={m.system.toUpperCase()} /></div>
      </section>
      {legal}
      {contents}
      {chapters}
    </main>
  </>;
}

async function collectContentImages(document: DocumentData, root: string) {
  const imageSrcs = new Set<string>();
  for (const chapter of document.chapters) {
    for (const block of chapter.blocks) {
      if (block.type === "full-bleed" || block.type === "vignette" || block.type === "spot") {
        imageSrcs.add(block.src);
      }
    }
  }
  const images = [];
  for (const src of imageSrcs) {
    const fullPath = `${root}/${src}`;
    try {
      const data = await readFile(fullPath);
      images.push({ src, data });
    } catch (e) {
      console.warn(`Warning: could not load image ${src}: ${e}`);
    }
  }
  return images;
}

export async function documentAssets(root: string, document?: DocumentData): Promise<DocumentAssets> {
  const [regular, bold, italic, glyphs, fallback, cover] = await Promise.all([
    readFile(`${root}/node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff2`),
    readFile(`${root}/node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff2`),
    readFile(`${root}/node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-italic.woff2`),
    readFile(`${root}/assets/fonts/GenesysGlyphsAndDice-3.0.ttf`),
    readFile(`${root}/node_modules/@fontsource/dejavu-sans/files/dejavu-sans-latin-400-normal.woff2`),
    readFile(`${root}/assets/cover-festoon.png`),
  ]);
  const contentImages = document ? await collectContentImages(document, root) : [];
  return {
    fonts: [
      { name: "Libre Baskerville", data: regular, weight: 400 },
      { name: "Libre Baskerville", data: bold, weight: 700 },
      { name: "Libre Baskerville", data: italic, weight: 400, style: "italic" as const },
      { name: "Genesys", data: glyphs },
      { name: "DejaVu Sans", data: fallback },
    ],
    images: [{ src: "cover-festoon.png", data: cover }, ...contentImages],
    fontFamilies: ["Libre Baskerville", "Genesys", "DejaVu Sans", "serif"],
  };
}
