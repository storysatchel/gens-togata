import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeNarration } from "../src/output/speech";

test("narrates the authored logical tree and groups chapters by part markers", async () => {
  const root = await mkdtemp(join(tmpdir(), "gens-speech-"));
  try {
    await writeNarration({
      meta: { title: "Title", subtitle: "Subtitle", system: "System", tagline: "Tagline", legal: [] },
      elements: [
        { type: "h1", content: "Introduction", properties: { semanticRole: "chapter" } },
        { type: "story", content: "", columns: 2, gutter: 12, children: [
          { type: "p", content: "Before the first part." },
        ] },
        { type: "h1", content: "Part I: The Empire", properties: { semanticRole: "part" } },
        { type: "h1", content: "The Collegia", properties: { semanticRole: "chapter" } },
        { type: "story", content: "", columns: 2, gutter: 12, children: [
          { type: "p", content: "", children: [
            { type: "text", content: "Roll " },
            { type: "text", content: "k", properties: { semanticRole: "dice:ability" } },
            { type: "text", content: " and " },
            { type: "text", content: "s", properties: { semanticRole: "result:success" } },
            { type: "text", content: "." },
            { type: "text", content: "12", properties: { semanticRole: "note-ref" } },
          ] },
          { type: "sidebar", content: "An aside.", properties: { semanticRole: "aside" } },
          { type: "p", content: "After the aside." },
          { type: "list", content: "", children: [
            { type: "list-item", content: "First item" },
            { type: "list-item", content: "Second item." },
          ] },
          { type: "table", content: "", table: { headerRows: 1 }, children: [
            { type: "table-row", content: "", children: [{ type: "table-cell", content: "Name" }, { type: "table-cell", content: "Brawn" }] },
            { type: "table-row", content: "", children: [{ type: "table-cell", content: "Legionary" }, { type: "table-cell", content: "3" }] },
          ] },
          { type: "strip", content: "", slots: [
            { elements: [{ type: "stat-field", content: "Skills: Athletics 2." }] },
            { elements: [{ type: "stat-field", content: "Gear: Shield." }] },
          ] },
          { type: "zone-map", content: "", zones: [
            { elements: [{ type: "p", content: "First zone." }] },
            { elements: [{ type: "p", content: "Second zone." }] },
          ] },
          { type: "image", content: "decorative image" },
          { type: "h2", content: "Notes", properties: { semanticRole: "notes" } },
          { type: "list", content: "", properties: { semanticRole: "notes" }, children: [{ type: "list-item", content: "Secret note" }] },
        ] },
        { type: "h1", content: "Another Chapter", properties: { semanticRole: "chapter" } },
        { type: "story", content: "", columns: 2, gutter: 12, children: [{ type: "p", content: "Same part." }] },
        { type: "h1", content: "Part II: Beyond", properties: { semanticRole: "part" } },
        { type: "h1", content: "The Frontier", properties: { semanticRole: "chapter" } },
        { type: "story", content: "", columns: 2, gutter: 12, children: [{ type: "p", content: "Next part." }] },
      ],
    }, root);
    const transcript = await readFile(join(root, "audio", "transcript.txt"), "utf8");
    const first = await readFile(join(root, "audio", "part_1.txt"), "utf8");
    const second = await readFile(join(root, "audio", "part_2.txt"), "utf8");
    expect(transcript).toContain("Introduction. Before the first part.\n\nPart I: The Empire. The Collegia.");
    expect(transcript).toContain("Roll ability and success. An aside. After the aside. First item. Second item.");
    expect(transcript).toContain("Name: Legionary; Brawn: 3. Skills: Athletics 2. Gear: Shield. First zone. Second zone.");
    expect(transcript).not.toContain("Secret note");
    expect(transcript).not.toContain("decorative image");
    expect(transcript).not.toContain("success. 12");
    expect(first).toContain("Introduction. Before the first part.");
    expect(first).toContain("Another Chapter. Same part.");
    expect(first).not.toContain("Part II");
    expect(second).toBe("Part II: Beyond. The Frontier. Next part.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("narration keeps part labels and aside titles as separate spoken sentences", async () => {
  const root = await mkdtemp(join(tmpdir(), "gens-speech-"));
  try {
    const run = (content: string, properties: Record<string, unknown>) => ({ type: "text", content, properties: { sourceId: `run-${content}` } });
    await writeNarration({
      meta: { title: "T", subtitle: "S", tagline: "G", system: "Genesys", legal: [] },
      elements: [
        { type: "h1", content: "Part I: Playing", properties: { sourceId: "part", semanticRole: "part", partLabel: "Part I", partTitle: "Playing" } },
        { type: "h1", content: "", children: [run("Chapter", {})], properties: { sourceId: "chapter", semanticRole: "chapter", audioPart: 1 } },
        { type: "story", content: "", columns: 2, gutter: 12, balance: false, properties: { sourceId: "story" }, children: [
          { type: "sidebar", content: "", children: [run("A Brief Timeline", {})], properties: { sourceId: "aside-title", semanticRole: "aside" } },
          { type: "sidebar", content: "", children: [run("Kingdom began early.", {})], properties: { sourceId: "aside-body", semanticRole: "aside" } },
        ] },
      ],
    }, root);
    const transcript = await readFile(join(root, "audio", "transcript.txt"), "utf8");
    expect(transcript).toContain("Part I: Playing. Chapter. A Brief Timeline. Kingdom began early.");
  } finally { await rm(root, { recursive: true, force: true }); }
});
