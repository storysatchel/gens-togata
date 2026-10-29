import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { DocumentData } from "./types";

export async function loadDocument(path: string): Promise<DocumentData> {
  const source = await readFile(path, "utf8");
  const document = parse(source) as DocumentData;
  if (!document?.meta || !Array.isArray(document.chapters)) {
    throw new Error(`${path}: expected meta and chapters`);
  }
  return document;
}
