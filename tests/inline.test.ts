import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inline } from "../src/inline/inline";
import { writeNarration } from "../src/output/speech";

test("flattens nested emphasis while preserving both styles and restoring surrounding styles", () => {
  expect(inline("**Beyond the *Limes*** and *a **bold** word*")).toEqual([
    { type: "text", content: "Beyond the ", properties: { style: { fontWeight: "bold" } } },
    { type: "text", content: "Limes", properties: { style: { fontWeight: "bold", fontStyle: "italic" } } },
    { type: "text", content: " and " },
    { type: "text", content: "a ", properties: { style: { fontStyle: "italic" } } },
    { type: "text", content: "bold", properties: { style: { fontStyle: "italic", fontWeight: "bold" } } },
    { type: "text", content: " word", properties: { style: { fontStyle: "italic" } } },
  ]);
  expect(inline("***both***")).toEqual([
    { type: "text", content: "both", properties: { style: { fontWeight: "bold", fontStyle: "italic" } } },
  ]);
});

test("preserves keywords and superscript notes inside emphasis", () => {
  const runs = inline("**A [[Talent]] and note{{12}}**");
  expect(runs.map(run => run.content).join("")).toBe("A Talent and note12");
  expect(runs[1]?.properties?.style).toEqual({ fontWeight: "bold", color: "#8a5a12" });
  expect(runs[3]?.properties?.style).toEqual({
    fontSize: 4.48, baselineShift: 2.8, inlineMarginLeft: 0.3, color: "#8a5a12", fontWeight: "bold",
  });
});

test("maps every Genesys result symbol to its glyph without changing its meaning", () => {
  const runs = inline("[[Advantage success triumph threat failure despair]]");
  expect(runs.map(run => run.content)).toEqual(["a", "s", "t", "h", "f", "d"]);
  for (const run of runs) expect(run.properties?.style).toMatchObject({
    fontFamily: "Genesys", fontStyle: "normal", fontWeight: "normal",
  });
});

test("maps dice and the difficulty bullet to distinct colors and upright glyphs", () => {
  const runs = inline("*[[boost setback difficulty ability proficiency challenge]]●*");
  expect(runs.map(run => run.content)).toEqual(["j", "j", "k", "k", "l", "l", "k"]);
  expect(runs.map(run => run.properties?.style?.color)).toEqual([
    "#1f8f80", "#231f20", "#552c7f", "#2e8b43", "#b99400", "#771214", "#552c7f",
  ]);
  for (const run of runs) expect(run.properties?.style?.fontStyle).toBe("normal");
});

test("keeps mixed or unknown marked terms as keywords rather than partial dice sequences", () => {
  const runs = inline("[[boost skill]]");
  expect(runs).toEqual([
    { type: "text", content: "boost skill", properties: { style: { fontWeight: "bold", color: "#8a5a12" } } },
  ]);
});

test("omits sidebar markers without consuming neighboring prose or emphasis", () => {
  expect(inline("Before{{sidebar}}after").map(run => run.content).join("")).toBe("Beforeafter");
  expect(inline("**left{{sidebar}}right**").map(run => run.properties?.style?.fontWeight)).toEqual(["bold", "bold"]);
  expect(inline("{{sidebar}}")).toEqual([]);
});

test("narration removes nested emphasis from headings and prose", async () => {
  const root = await mkdtemp(join(tmpdir(), "gens-inline-"));
  try {
    await writeNarration({
      meta: { title: "Title", subtitle: "Subtitle", system: "System", tagline: "Tagline", legal: [] },
      chapters: [{ title: "**The *Collegia***", part: { label: "Part I", title: "*The **Empire***" }, blocks: [
        { type: "list", items: ["**Beyond the *Limes*.** An example."] },
      ] }],
    }, root);
    const transcript = await readFile(join(root, "audio", "transcript.txt"), "utf8");
    expect(transcript).toContain("Part I: The Empire. The Collegia. Beyond the Limes. An example.");
    expect(transcript).not.toContain("*");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
