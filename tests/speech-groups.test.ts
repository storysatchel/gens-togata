import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeNarration } from "../src/output/speech";

test("uses authored audio groups, including part titles preceding their chapters", async () => {
  const root = await mkdtemp(join(tmpdir(), "gens-speech-groups-"));
  try {
    await writeNarration({
      meta: { title: "Title", subtitle: "Subtitle", system: "System", tagline: "Tagline", legal: [] },
      elements: [
        { type: "h1", content: "Prologue", properties: { semanticRole: "chapter", audioPart: 1 } },
        { type: "p", content: "Opening." },
        { type: "h1", content: "Part I", properties: { semanticRole: "part" } },
        { type: "h1", content: "First", properties: { semanticRole: "chapter", audioPart: 2 } },
        { type: "p", content: "First chapter." },
        { type: "h1", content: "Second", properties: { semanticRole: "chapter", audioPart: 3 } },
        { type: "p", content: "Second chapter." },
        { type: "h1", content: "Third", properties: { semanticRole: "chapter", audioPart: 3 } },
        { type: "p", content: "Third chapter." },
      ],
    }, root);
    const first = await readFile(join(root, "audio", "part_1.txt"), "utf8");
    const second = await readFile(join(root, "audio", "part_2.txt"), "utf8");
    const third = await readFile(join(root, "audio", "part_3.txt"), "utf8");
    const transcript = await readFile(join(root, "audio", "transcript.txt"), "utf8");
    expect(first).toContain("Prologue. Opening.");
    expect(first).not.toContain("Part I");
    expect(second).toBe("Part I. First. First chapter.");
    expect(third).toBe("Second. Second chapter. Third. Third chapter.");
    expect(transcript).toContain("Part I. First. First chapter.\n\nSecond. Second chapter.\n\nThird. Third chapter.");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
