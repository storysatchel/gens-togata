import { readFile } from "node:fs/promises";
import type { DocumentData } from "../content/types";
import { Inline } from "../inline/Inline";
import { Contents } from "./Contents";
import { Chapter } from "./Chapter";

export async function DocumentTemplate({ document, root }: { document: DocumentData; root: string }) {
  const css = await readFile(`${root}/styles.css`, "utf8");
  const m = document.meta;
  return <>
    <style>{css}</style>
    <main className="document">
      <section className="cover">
        <img className="festoon" src="cover-festoon.png" alt="" />
        <h1 className="ptitle">{m.title}</h1>
        <div className="psub">{m.subtitle}</div><div className="ptag">“{m.tagline}”</div>
        <div className="psys">{m.system.toUpperCase()}</div>
      </section>
      <section className="legal-page">{m.legal.map((paragraph, i) => <p className="legal" key={i}><Inline text={paragraph} /></p>)}</section>
      <Contents chapters={document.chapters} />
      {document.chapters.map((chapter, index) => <Chapter key={index} chapter={chapter} chapterIndex={index} />)}
    </main>
  </>;
}

export async function documentAssets(root: string) {
  const [regular, bold, italic, glyphs, fallback, cover] = await Promise.all([
    readFile(`${root}/node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff2`),
    readFile(`${root}/node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff2`),
    readFile(`${root}/node_modules/@fontsource/libre-baskerville/files/libre-baskerville-latin-400-italic.woff2`),
    readFile(`${root}/assets/fonts/GenesysGlyphsAndDice-3.0.ttf`),
    readFile(`${root}/node_modules/@fontsource/dejavu-sans/files/dejavu-sans-latin-400-normal.woff2`),
    readFile(`${root}/assets/cover-festoon.png`),
  ]);
  return {
    fonts: [
      { name: "Libre Baskerville", data: regular, weight: 400 },
      { name: "Libre Baskerville", data: bold, weight: 700 },
      { name: "Libre Baskerville", data: italic, weight: 400, style: "italic" as const },
      { name: "Genesys", data: glyphs },
      { name: "DejaVu Sans", data: fallback },
    ],
    images: [{ src: "cover-festoon.png", data: cover }],
    fontFamilies: ["Libre Baskerville", "Genesys", "DejaVu Sans", "serif"],
  };
}
