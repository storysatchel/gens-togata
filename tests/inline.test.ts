import { expect, test } from "bun:test";
import { inline } from "../src/inline/inline";

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

test("marks keywords and note references semantically inside emphasis, leaving presentation to the theme", () => {
  const runs = inline("**A [[Talent]] and note{{12}}**");
  expect(runs.map(run => run.content).join("")).toBe("A Talent and note12");
  expect(runs.map(run => run.properties?.semanticRole)).toEqual([undefined, "keyword", undefined, "note-ref"]);
  for (const run of runs) expect(run.properties?.style).toEqual({ fontWeight: "bold" });
});

test("maps every Genesys result symbol to its glyph code and result role", () => {
  const runs = inline("[[Advantage success triumph threat failure despair]]");
  expect(runs.map(run => run.content)).toEqual(["a", "s", "t", "h", "f", "d"]);
  expect(runs.map(run => run.properties?.semanticRole)).toEqual(["result:advantage", "result:success", "result:triumph", "result:threat", "result:failure", "result:despair"]);
  for (const run of runs) expect(run.properties?.style).toBeUndefined();
});

test("maps dice and the difficulty bullet to distinct dice roles, even inside emphasis", () => {
  const runs = inline("*[[boost setback difficulty ability proficiency challenge]]●*");
  expect(runs.map(run => run.content)).toEqual(["j", "j", "k", "k", "l", "l", "k"]);
  expect(runs.map(run => run.properties?.semanticRole)).toEqual(["dice:boost", "dice:setback", "dice:difficulty", "dice:ability", "dice:proficiency", "dice:challenge", "dice:difficulty"]);
});

test("keeps mixed or unknown marked terms as keywords rather than partial dice sequences", () => {
  expect(inline("[[boost skill]]")).toEqual([
    { type: "text", content: "boost skill", properties: { semanticRole: "keyword" } },
  ]);
});

test("omits sidebar markers without consuming neighboring prose or emphasis", () => {
  expect(inline("Before{{sidebar}}after").map(run => run.content).join("")).toBe("Beforeafter");
  expect(inline("**left{{sidebar}}right**").map(run => run.properties?.style?.fontWeight)).toEqual(["bold", "bold"]);
  expect(inline("{{sidebar}}")).toEqual([]);
});

