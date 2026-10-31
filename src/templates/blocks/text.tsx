import { Inline } from "../../inline/Inline";
import type { TextBlock, SidebarBlock, ProcedureBlock, ListBlock, EndnotesBlock } from "../../content/types";

const paragraphClasses: Record<string, string> = { body: "", lead: "lead", small: "small", deriv: "deriv", act: "act", chk: "chk" };

export function TextBlockView({ block, id, runsOn }: { block: TextBlock; id?: string; runsOn?: boolean }) {
  switch (block.type) {
    case "h2": return <h2 id={id}><Inline text={block.text} /></h2>;
    case "h3": return <h3 id={id}><Inline text={block.text} /></h3>;
    case "h4": return <h4 id={id}><Inline text={block.text} /></h4>;
    case "scenario": return <h3 id={id} className="scenario-h"><Inline text={block.text} /></h3>;
    case "p": return <p className={[paragraphClasses[block.style ?? "body"] ?? "", runsOn ? "runs-on" : ""].filter(Boolean).join(" ")}><Inline text={block.text} /></p>;
    case "readaloud": return <div className="readaloud"><Inline text={block.text} /></div>;
    case "synopsis": return <div className="synopsis"><strong>Synopsis.</strong> <Inline text={block.text} /></div>;
    case "example": return <div className="ex"><Inline text={block.text} /></div>;
  }
}

export function Sidebar({ block }: { block: SidebarBlock }) {
  return <aside className="sidebar"><h4><Inline text={block.title} /></h4>{(block.body ?? []).map((text, i) => <p key={i}><Inline text={text} /></p>)}</aside>;
}

export function Procedure({ block }: { block: ProcedureBlock }) {
  return <section className="proc"><h4><Inline text={block.title} /></h4><ol>{block.steps.map((step, i) => <li key={i}><Inline text={step} /></li>)}</ol></section>;
}

export function BulletList({ block }: { block: ListBlock }) {
  return <ul>{block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ul>;
}

export function Endnotes({ block, continued, start }: { block: EndnotesBlock; continued?: boolean; start?: number }) {
  return <section className={continued ? "endnotes continued" : "endnotes"}>{continued ? null : <h4><Inline text={block.title ?? "Notes"} /></h4>}<ol start={start}>{block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ol></section>;
}
