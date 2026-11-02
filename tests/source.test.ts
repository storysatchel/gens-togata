import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadDocument } from "../src/content/load";
import { documentInput } from "../src/templates/document";
import { bookTheme } from "../src/templates/styles";
import type { Element } from "@vmprint/engine";

const metadata = { title: "Proof", subtitle: "", tagline: "", system: "Genesys", legal: [] };
const chapter = (id: string): Element => ({ type: "h1", content: id, properties: { sourceId: id, semanticRole: "chapter" } });

test("source rejects duplicate identities and dangling notes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "book-source-"));
  const path = join(dir, "input.yaml");
  try {
    const load = async (elements: unknown[]) => {
      await writeFile(path, JSON.stringify({ meta: metadata, elements }));
      return loadDocument(path);
    };
    await expect(load([chapter("same"), chapter("same")])).rejects.toThrow("duplicate sourceId");
    await expect(load([chapter("first"), { type: "p", content: "", properties: { sourceId: "paragraph" }, children: [{ type: "text", content: "3", properties: { sourceId: "ref", semanticRole: "note-ref" } }] }])).rejects.toThrow("note 3 does not exist");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("dice, keywords, note references, and metric tables obtain their presentation only from the theme", async () => {
  const runs: Element[] = [
    { type: "text", content: "k", properties: { sourceId: "die", semanticRole: "dice:ability" } },
    { type: "text", content: "Talent", properties: { sourceId: "kw", semanticRole: "keyword" } },
    { type: "text", content: "1", properties: { sourceId: "ref", semanticRole: "note-ref" } },
  ];
  const metrics: Element = { type: "table", content: "", properties: { sourceId: "metrics", semanticRole: "stat-metrics" }, table: { columns: [{ mode: "fixed", value: 78 }] }, children: [{ type: "table-row", content: "", properties: { sourceId: "metrics-row" }, children: [{ type: "table-cell", content: "3", properties: { sourceId: "metrics-cell" } }] }] };
  const input = await documentInput({ meta: metadata, elements: [{ type: "p", content: "", children: runs, properties: { sourceId: "prose" } }, metrics] }, process.cwd());
  const prose = input.elements.find(element => element.properties?.sourceId === "prose")!;
  expect(prose.children![0]!.properties?.style).toMatchObject({ fontFamily: "Genesys", color: bookTheme.colors.dice.ability });
  expect(prose.children![1]!.properties?.style).toMatchObject({ fontWeight: "bold", color: bookTheme.colors.annotation });
  expect(prose.children![2]!.properties?.style).toMatchObject({ baselineShift: 2.8 });
  const cell = input.elements.find(element => element.properties?.sourceId === "metrics")!.children![0]!.children![0]!;
  expect(cell.properties?.style).toMatchObject(bookTheme.table.statCellStyle);
  expect(runs[1]!.properties?.style).toBeUndefined();
});
