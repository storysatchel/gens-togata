import { resolve } from "node:path";
import { loadDocument } from "./content/load";
import { writePdf } from "./output/pdf";

const root = resolve(import.meta.dir, "..");
const [prefix = "Chapter 1: Character Creation", label = "Character Creation", output = "build/excerpt.pdf"] = process.argv.slice(2);
const document = await loadDocument(`${root}/content.yaml`);
const chapters = document.chapters.filter(chapter => String(chapter.title).startsWith(prefix));
if (chapters.length === 0) throw new Error(`No chapter starting with ${JSON.stringify(prefix)}`);

await writePdf({
  ...document,
  meta: { ...document.meta, subtitle: `${label} · Preview` },
  chapters,
}, root, resolve(root, output));
