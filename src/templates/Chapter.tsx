import type { Chapter as ChapterData } from "../content/types";
import { type Flow, type Piece, Page } from "./flow";

export async function Chapter({ chapter, chapterIndex, flow }: { chapter: ChapterData; chapterIndex: number; flow: Flow }) {
  let subsection = 0;
  let afterHeading = true;
  const entries = chapter.blocks.map((block, index) => {
    const id = ["h2", "h3", "scenario"].includes(block.type) ? `c${chapterIndex}s${subsection++}` : undefined;
    const full = block.type === "h2" || block.type === "table" || block.type === "endnotes" || (block.type === "p" && afterHeading);
    if (block.type === "h2") afterHeading = true;
    else if (block.type === "p" && afterHeading) afterHeading = false;
    else if (block.type !== "p") afterHeading = false;
    const piece: Piece = { block, key: `${chapterIndex}.${index}`, id, fragment: {} };
    return { piece, full };
  });
  const title = <h1 className="ch" id={`c${chapterIndex}`}><span>{chapter.title}</span></h1>;
  // The part title page fills one page ahead of the chapter; count it so the flow keeps recto/verso right.
  if (chapter.part) flow.skipPage();
  const pages = await flow.paginate([{ kind: "node", key: `c${chapterIndex}`, node: title }], entries);
  return <>
    {chapter.part ? <section className="part-page" id={`p${chapterIndex}`}>{chapter.part.label ? <div className="part-label">{chapter.part.label}</div> : null}<h1 className="part-title">{chapter.part.title}</h1></section> : null}
    <article className="chapter">{pages.map((layout, i) => <Page key={i} {...layout} />)}</article>
  </>;
}
