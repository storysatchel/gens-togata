import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { DocumentData } from "./types";

export async function loadDocument(path: string): Promise<DocumentData> {
  const source = await readFile(path, "utf8");
  const document = parse(source) as DocumentData;
  if (!document?.meta || !Array.isArray(document.chapters)) {
    throw new Error(`${path}: expected meta and chapters`);
  }
  for (const chapter of document.chapters) {
    for (const block of chapter.blocks) {
      if (!("text" in block)) continue;
      const anchors = block.text.match(/\{\{sidebar\}\}/g)?.length ?? 0;
      const sidebar = "sidebar" in block ? block.sidebar : undefined;
      if ((anchors > 0 || sidebar) && (block.type !== "p" || anchors !== 1 || !sidebar || sidebar.type !== "sidebar")) {
        throw new Error(`${path}: ${chapter.title}: an anchored sidebar requires one {{sidebar}} in a paragraph and a sidebar block`);
      }
    }
  }
  return document;
}
