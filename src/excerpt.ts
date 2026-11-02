import { resolve } from "node:path";
import { loadDocument } from "./content/load";
import { writePdf } from "./output/pdf";
import { elementText } from "./templates/document";

const root = resolve(import.meta.dir, "..");
const [prefix = "Character Creation", label = "Character Creation", output = "build/excerpt.pdf"] = process.argv.slice(2);
const document = await loadDocument(`${root}/content.yaml`);
const elements = [];
let include = false;
let pendingPart = undefined as typeof document.elements[number] | undefined;
for (const element of document.elements) {
  const role = element.properties?.semanticRole;
  if (role === "part") {
    include = false;
    pendingPart = element;
    continue;
  }
  if (role === "chapter") {
    include = elementText(element).startsWith(prefix);
    if (include && pendingPart) elements.push(pendingPart);
    pendingPart = undefined;
  }
  if (include) elements.push(element);
}
if (!elements.length) throw new Error(`No chapter starting with ${JSON.stringify(prefix)}`);

await writePdf({
  ...document,
  meta: { ...document.meta, subtitle: `${label} · Preview` },
  elements,
}, root, resolve(root, output));
