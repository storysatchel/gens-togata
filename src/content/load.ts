import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { Element } from "@vmprint/engine";
import { walkElements } from "../templates/document";
import type { DocumentData } from "./types";

type Problem = readonly [id: string, message: string];
type Rule = (elements: Element[]) => Problem[];

const fail = (path: string) => (id: string, message: string): never => { throw new Error(`${path}: ${id}: ${message}`); };

const role = (e: Element) => e.properties?.semanticRole;
const idOf = (e: Element): string => e.properties?.sourceId ?? "";
const hasRole = (name: string) => (e: Element) => role(e) === name;

// Fold the reading-order stream into chapters; anything before the first chapter heading forms its own group.
const chapters = (es: Element[]): Element[][] =>
  [0, ...es.flatMap((e, i) => hasRole("chapter")(e) ? [i] : [])].map((start, k, starts) => es.slice(start, starts[k + 1]));

const perChapter = (rule: Rule): Rule => es => chapters(es).flatMap(rule);

const badIds: Rule = es => es
  .filter(e => !idOf(e) || idOf(e).startsWith("toc-"))
  .map(e => [idOf(e), "sourceId must be a nonempty string outside the reserved toc- prefix"]);

const duplicateIds: Rule = es => [...es.reduce((counts, e) => counts.set(idOf(e), (counts.get(idOf(e)) ?? 0) + 1), new Map<string, number>())]
  .filter(([, count]) => count > 1)
  .map(([id]) => [id, "duplicate sourceId"]);

const danglingNotes: Rule = chapter => {
  const noted = new Set(chapter.filter(hasRole("note")).map(e => e.properties!.noteNumber));
  return chapter.filter(hasRole("note-ref")).filter(e => !noted.has(Number(e.content)))
    .map(e => [idOf(e), `note ${e.content} does not exist in its chapter`]);
};

const rules: Rule[] = [badIds, duplicateIds, perChapter(danglingNotes)];
const problems: Rule = es => rules.flatMap(rule => rule(es));

/** Structure and styles are validated by VMPrint's own loader; this checks identities and note references only. */
export async function loadDocument(path: string): Promise<DocumentData> {
  const data = parse(await readFile(path, "utf8")) as DocumentData;
  if (!data?.meta || !Array.isArray(data.elements)) fail(path)("document", "expected meta and elements");
  const [first] = problems([...walkElements(data.elements)]);
  if (first) fail(path)(...first);
  return data;
}
