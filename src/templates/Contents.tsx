import type { Chapter, ContentBlock, TextBlock } from "../content/types";
import { TargetPageNumber } from "takumi-pdf/primitives";
import { Inline } from "../inline/Inline";

function isHeading(block: ContentBlock): block is TextBlock {
  return "text" in block && ["h2", "h3", "scenario"].includes(block.type);
}

export function Contents({ chapters }: { chapters: Chapter[] }) {
  return <nav className="toc">
    <h1 className="ch">Contents</h1>
    {chapters.map((chapter, ci) => <div key={ci}>
      {chapter.part ? <a className="toc-part" href={`#p${ci}`}><span>{chapter.part.label ? `${chapter.part.label}: ` : ""}{chapter.part.title}</span><span className="leader" /><TargetPageNumber /></a> : null}
      <a className="toc-l1" href={`#c${ci}`}><span><Inline text={chapter.title} /></span><span className="leader" /><TargetPageNumber /></a>
      {chapter.blocks.filter(isHeading).map((block, si) => <a className="toc-l2" href={`#c${ci}s${si}`} key={si}><span><Inline text={block.text} /></span><span className="leader" /><TargetPageNumber /></a>)}
    </div>)}
  </nav>;
}
