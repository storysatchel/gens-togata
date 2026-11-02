import { expect, test } from "bun:test";
import { migrateLegacy } from "../tools/migrate-vmprint";
import { stringify, parse } from "yaml";
import type { Element } from "@vmprint/engine";

const meta = { title: "T", subtitle: "S", tagline: "G", system: "Genesys", legal: [] };
const legacy = (blocks: unknown[]) => ({ meta, chapters: [{ title: "Forum", blocks }] });
const walk = (elements: Element[], visit: (element: Element) => void): void => { for (const e of elements) { visit(e); walk(e.children ?? [], visit); } };

test("legacy markers become semantic runs and identities are deterministic", () => {
  const source = legacy([{ type: "p", text: "Roll [[ability]] and [[success]] then note.{{1}}" }, { type: "endnotes", items: ["Source."] }]);
  const a = migrateLegacy(structuredClone(source)), b = migrateLegacy(structuredClone(source));
  expect(stringify(a, { aliasDuplicateObjects: false })).toBe(stringify(b, { aliasDuplicateObjects: false }));
  const roles: string[] = [];
  walk(a.elements, e => { const role = e.properties?.semanticRole; if (typeof role === "string") roles.push(role); });
  expect(roles).toEqual(expect.arrayContaining(["chapter", "dice:ability", "result:success", "note-ref", "note"]));
  expect(parse(stringify(a, { aliasDuplicateObjects: false })).elements.length).toBe(a.elements.length);
});

test("ambiguous legacy input is rejected instead of guessed", () => {
  expect(() => migrateLegacy(legacy([{ type: "mystery", text: "x" }]))).toThrow("unsupported legacy block type mystery");
  expect(() => migrateLegacy(legacy([{ type: "table", columns: ["A"], rows: [["x"]], style: "fancy" }]))).toThrow("unknown table style fancy");
  expect(() => migrateLegacy({ ...legacy([]), elements: [] })).toThrow("unambiguous");
});

test("a blank line inside one legacy block becomes separate native paragraphs", () => {
  const { elements } = migrateLegacy(legacy([{ type: "synopsis", text: "First paragraph.\n\nSecond paragraph." }]));
  const synopses: Element[] = [];
  walk(elements, e => { if (e.type === "synopsis") synopses.push(e); });
  expect(synopses).toHaveLength(2);
  const ids = (e: Element): unknown[] => [e.properties?.sourceId, ...(e.children ?? []).flatMap(ids)];
  const all = elements.flatMap(ids);
  expect(new Set(all).size).toBe(all.length);
});
