import type { ContentBlock } from "../../content/types";
import { TextBlockView, Sidebar, Procedure, BulletList, Endnotes } from "./text";
import { DataTable, Statblock } from "./data";

export function Block({ block, id }: { block: ContentBlock; id?: string }) {
  switch (block.type) {
    case "h2": case "h3": case "h4": case "scenario": case "p": case "readaloud": case "synopsis": case "example":
      return <TextBlockView block={block} id={id} />;
    case "sidebar": return <Sidebar block={block} />;
    case "procedure": return <Procedure block={block} />;
    case "list": return <BulletList block={block} />;
    case "table": return <DataTable block={block} />;
    case "statblock": return <Statblock block={block} />;
    case "endnotes": return <Endnotes block={block} />;
  }
}
