import type { ReactNode } from "react";
import type { Chapter as ChapterData, ContentBlock } from "../content/types";
import { Block } from "./blocks/Block";

// Keep each two-column grid band close to one page so neither column spills ahead of the other.
const COLUMN_PAGE_BUDGET = 3200;
type Entry = { block: ContentBlock; index: number; id?: string };

function blockWeight(block: ContentBlock): number {
  switch (block.type) {
    case "h2": case "h3": case "h4": case "scenario": case "p": case "readaloud": case "synopsis": case "example":
      return Math.max(1, block.text.length);
    case "sidebar": return block.title.length + (block.body ?? []).reduce((sum, text) => sum + text.length, 0);
    case "procedure": return block.title.length + block.steps.reduce((sum, text) => sum + text.length, 0);
    case "list": return block.items.reduce((sum, text) => sum + text.length, 0);
    case "table": return block.columns.reduce((sum, text) => sum + text.length, 0) + block.rows.reduce((sum, row) => sum + row.reduce((total, cell) => total + String(cell).length, 0), 0);
    case "statblock": return (block.name?.length ?? 0) + (block.kind?.length ?? 0) + (block.desc?.length ?? 0)
      + Object.entries(block.chars ?? {}).reduce((sum, [key, value]) => sum + key.length + String(value).length, 0)
      + Object.entries(block.derived ?? {}).reduce((sum, [key, value]) => sum + key.length + String(value).length, 0)
      + (block.fields ?? []).reduce((sum, field) => sum + (field.label?.length ?? 0) + (field.text?.length ?? 0), 0);
    case "endnotes": return (block.title?.length ?? 0) + block.items.reduce((sum, text) => sum + text.length, 0);
  }
}

function Columns({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) return null;
  const weights = entries.map(entry => blockWeight(entry.block));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let leftWeight = 0;
  let splitAt = 0;
  let bestDelta = Infinity;
  for (let i = 1; i < entries.length; i++) {
    leftWeight += weights[i - 1];
    const preceding = entries[i - 1].block.type;
    if (preceding === "h3" || preceding === "h4" || preceding === "scenario") continue;
    const delta = Math.abs(total - 2 * leftWeight);
    if (delta < bestDelta) { bestDelta = delta; splitAt = i; }
  }
  const left = splitAt === 0 ? entries : entries.slice(0, splitAt);
  const right = splitAt === 0 ? [] : entries.slice(splitAt);
  const render = (entry: Entry) => <Block key={entry.index} block={entry.block} id={entry.id} />;
  return <div className="column-layout"><div className="column">{left.map(render)}</div><div className="column">{right.map(render)}</div></div>;
}

export function Chapter({ chapter, chapterIndex }: { chapter: ChapterData; chapterIndex: number }) {
  let subsection = 0;
  let afterHeading = true;
  let run: Entry[] = [];
  let runId = 0;
  const content: ReactNode[] = [];
  const flush = () => {
    if (run.length === 0) return;
    const sections: Entry[][] = [];
    let section: Entry[] = [];
    for (const entry of run) {
      const type = entry.block.type;
      if ((type === "h3" || type === "h4" || type === "scenario") && section.length > 0) {
        sections.push(section);
        section = [];
      }
      section.push(entry);
    }
    if (section.length > 0) sections.push(section);

    let pageEntries: Entry[] = [];
    let pageWeight = 0;
    for (const entries of sections) {
      const weight = entries.reduce((sum, entry) => sum + blockWeight(entry.block), 0);
      if (pageEntries.length > 0 && pageWeight + weight > COLUMN_PAGE_BUDGET) {
        content.push(<Columns key={`columns-${runId++}`} entries={pageEntries} />);
        pageEntries = [];
        pageWeight = 0;
      }
      pageEntries.push(...entries);
      pageWeight += weight;
    }
    if (pageEntries.length > 0) content.push(<Columns key={`columns-${runId++}`} entries={pageEntries} />);
    run = [];
  };

  chapter.blocks.forEach((block, index) => {
    const id = ["h2", "h3", "scenario"].includes(block.type) ? `c${chapterIndex}s${subsection++}` : undefined;
    const fullWidth = block.type === "h2" || block.type === "table" || block.type === "statblock" || block.type === "endnotes" || (block.type === "p" && afterHeading);
    if (block.type === "h2") afterHeading = true;
    else if (block.type === "p" && afterHeading) afterHeading = false;
    else if (block.type !== "p") afterHeading = false;

    if (fullWidth) {
      flush();
      content.push(<div className="fullw" key={`full-${index}`}><Block block={block} id={id} /></div>);
    } else {
      run.push({ block, index, id });
    }
  });
  flush();

  return <article className="chapter">
    <h1 className="ch" id={`c${chapterIndex}`}><span>{chapter.title}</span></h1>
    {content}
  </article>;
}
