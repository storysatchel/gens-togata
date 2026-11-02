import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { Element } from "@vmprint/engine";
import type { DocumentData } from "./types";

/** Structure and styles are validated by VMPrint's own loader; this checks identities and note references only. */
export async function loadDocument(path: string): Promise<DocumentData> {
  const data = parse(await readFile(path, "utf8")) as DocumentData;
  const fail = (id: string, message: string): never => { throw new Error(`${path}: ${id}: ${message}`); };
  if (!data?.meta || !Array.isArray(data.elements)) fail("document", "expected meta and elements");
  const ids = new Set<string>();
  let notes = new Set<number>(), refs: [number, string][] = [];
  const endChapter = () => {
    for (const [n, id] of refs) if (!notes.has(n)) fail(id, `note ${n} does not exist in its chapter`);
    notes = new Set(); refs = [];
  };
  const visit = (e: Element): void => {
    const id: string = e.properties?.sourceId ?? "";
    if (!id || id.startsWith("toc-")) fail(id, "sourceId must be a nonempty string outside the reserved toc- prefix");
    if (ids.has(id)) fail(id, "duplicate sourceId");
    ids.add(id);
    const role = e.properties?.semanticRole;
    if (role === "chapter") endChapter();
    if (role === "note") notes.add(e.properties!.noteNumber);
    if (role === "note-ref") refs.push([Number(e.content), id]);
    e.children?.forEach(visit);
  };
  data.elements.forEach(visit);
  endChapter();
  return data;
}
