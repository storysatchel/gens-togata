import { expect, test } from "bun:test";
import type { Element } from "@vmprint/engine";
import { normalizeSource } from "../tools/normalize-source";
import { bookTheme } from "../src/templates/styles";

const cell = (sourceId: string, content: string): Element => ({ type: "table-cell", content, properties: { sourceId, style: { fontSize: 4.5 } } });
const metric = (): Element => ({ type: "table", content: "", properties: { sourceId: "profile-metrics", semanticRole: "stat-metrics" }, table: { columns: [{ mode: "flex", fr: 1 }, { mode: "flex", fr: 1 }] }, children: [{ type: "table-row", content: "", properties: { sourceId: "row" }, children: [cell("brawn", "Brawn"), cell("score", "3")] }] });

test("metric table normalization preserves identities, removes per-cell styles, and is idempotent", () => {
  const table = metric();
  const elements: Element[] = [{ type: "story", content: "", children: [table] }];
  expect(normalizeSource(elements)).toEqual({ metrics: 3, keywords: 0 });
  expect(table.table?.columns).toEqual([{ mode: "fixed", value: 78 }, { mode: "fixed", value: 78 }]);
  expect(table.properties?.sourceId).toBe("profile-metrics");
  expect(table.children?.[0]?.children?.map(c => [c.properties?.sourceId, c.properties?.style])).toEqual([["brawn", undefined], ["score", undefined]]);
  expect(normalizeSource(elements)).toEqual({ metrics: 0, keywords: 0 });
});

test("keyword presentation becomes a semantic role, and ambiguous colouring is reported", () => {
  const run = (sourceId: string, style: Record<string, unknown>): Element => ({ type: "text", content: "Talent", properties: { sourceId, style } });
  const keyword = run("keyword-run", { fontWeight: "bold", color: bookTheme.colors.annotation });
  const plain = run("bold-run", { fontWeight: "bold" });
  expect(normalizeSource([{ type: "p", content: "", children: [keyword, plain] }]).keywords).toBe(1);
  expect(keyword.properties).toEqual({ sourceId: "keyword-run", semanticRole: "keyword" });
  expect(plain.properties?.style).toEqual({ fontWeight: "bold" });
  const ambiguous = run("odd-run", { fontWeight: "bold", fontStyle: "italic", color: bookTheme.colors.annotation });
  expect(() => normalizeSource([{ type: "p", content: "", children: [ambiguous] }])).toThrow("Ambiguous annotation-coloured run odd-run");
});
