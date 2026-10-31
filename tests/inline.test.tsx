import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isValidElement, type ReactNode } from "react";
import { Inline, inlinePattern } from "../src/inline/Inline";
import { writeNarration } from "../src/output/speech";

function tree(node: ReactNode): unknown {
  if (Array.isArray(node)) return node.map(tree);
  if (isValidElement<{ children?: ReactNode }>(node)) return { type: node.type, children: tree(node.props.children) };
  return node;
}

test("renders nested emphasis without exposing delimiters", () => {
  expect(tree(Inline({ text: "**The *Collegia* & the Mob.**" }))).toEqual([
    { type: "strong", children: ["The ", { type: "em", children: ["Collegia"] }, " & the Mob."] },
  ]);
  expect(tree(Inline({ text: "**Beyond the *Limes*** and *a **bold** word*" }))).toEqual([
    { type: "strong", children: ["Beyond the ", { type: "em", children: ["Limes"] }] },
    " and ",
    { type: "em", children: ["a ", { type: "strong", children: ["bold"] }, " word"] },
  ]);
  expect(tree(Inline({ text: "***both***" }))).toEqual([
    { type: "strong", children: [{ type: "em", children: ["both"] }] },
  ]);
});

test("renders other inline tokens within emphasis", () => {
  expect(tree(Inline({ text: "**A [[boost]] and note{{2}}**" }))).toEqual([
    { type: "strong", children: ["A ", [{ type: "span", children: "j" }], " and note", { type: "sup", children: "2" }] },
  ]);
});

test("keeps complete nested spans together for paragraph splitting", () => {
  const text = "before **The *Collegia* & the Mob.** after *a **bold phrase** here* end";
  expect([...text.matchAll(inlinePattern)].map(match => match[0])).toEqual([
    "**The *Collegia* & the Mob.**", "*a **bold phrase** here*",
  ]);
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
