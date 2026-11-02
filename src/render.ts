import { resolve } from "node:path";
import { loadDocument } from "./content/load";
import { writeNarration } from "./output/speech";
import { writePdf } from "./output/pdf";

const root = resolve(import.meta.dir, "..");
const args = process.argv.slice(2);
const audioOnly = args[0] === "--audio-only";
const [contentArg, outputArg] = audioOnly ? ["content.yaml", undefined] : args;
const isMainBook = !contentArg || contentArg === "content.yaml";
const document = await loadDocument(resolve(root, contentArg ?? "content.yaml"));

if (audioOnly) {
  await writeNarration(document, root);
  console.log("Narration -> audio/part_*.txt and audio/transcript.txt");
} else {
  const outputPath = resolve(root, outputArg ?? (isMainBook ? "dist/Gens Togata.pdf" : "dist/Gens Togata - Style Guide.pdf"));
  await writePdf(document, root, outputPath);
  if (isMainBook) {
    await writeNarration(document, root);
    console.log("Narration -> audio/part_*.txt and audio/transcript.txt");
  }
}
