import { mkdir, writeFile } from "node:fs/promises";
import type { ContentBlock, DocumentData, StatBlock } from "../content/types";

const HMAP: Record<string, string> = { Br: "Brawn", Ag: "Agility", Int: "Intellect", Cun: "Cunning", Will: "Willpower", Pr: "Presence" };
function plain(text: string): string { return text.replace(/\[\[(.+?)\]\]/g, "$1").replace(/\{\{\d+\}\}/g, "").replace(/\*\*/g, "").replace(/\*/g, ""); }
function speechclean(text: string): string {
  const replacements: Array<[string, string]> = [["W.T.", "Wound Threshold"], ["S.T.", "Strain Threshold"], ["(M/R)", "melee and ranged"], ["M/R", "melee and ranged"], ["HS", "sesterces"], ["●", " difficulty "], ["vitis ", "vitis"], [" HP:", " Hard Points:"], ["Price/Rarity", "price and rarity"], ["Encumbrance Cap", "cargo capacity"], [" HT ", " Hull Trauma "], [" SS ", " System Strain "], ["(R, military)", "rare, military only"], ["(R)", "rare"], [" | ", ". "], ["|", ". "]];
  for (const [a, b] of replacements) text = text.replaceAll(a, b);
  text = text.replace(/&/g, "and");
  const patterns: Array<[RegExp, string]> = [[/\bXP\b/g, "experience points"], [/\bGMs\b/g, "Game Masters"], [/\bGM\b/g, "Game Master"], [/\bPCs\b/g, "player characters"], [/\bPC\b/g, "player character"], [/\bEnc\b/g, "Encumbrance"], [/\bDam\b/g, "Damage"], [/\bCrit\b/g, "Critical"], [/\bSil\b/g, "Silhouette"], [/\bd10\b/g, "d-ten"], [/\bc\.\s/g, "circa "]];
  for (const [pattern, replacement] of patterns) text = text.replace(pattern, replacement);
  return text.replace(/price and rarity: ([\d,]+) [/ ]*(\w+)/g, "price $1 sesterces, rarity $2").replace(/\s+/g, " ").trim();
}
function statSpeech(block: StatBlock): string {
  const parts: string[] = [];
  const name = plain(block.name ?? "").trim();
  const kind = plain(block.kind ?? "").trim();
  parts.push(name + (name && !name.endsWith(".") ? "." : ""));
  if (kind) parts.push(`(${kind}).`);
  if (block.chars) {
    const values = Object.entries(block.chars).map(([key, value]) => `${HMAP[key] ?? key} ${value}`);
    if (block.derived) values.push(...Object.entries(block.derived).map(([key, value]) => `${key} ${value}`));
    parts.push(`Characteristics: ${values.join(", ")}.`);
  }
  if (block.desc) parts.push(plain(block.desc));
  for (const field of block.fields ?? []) parts.push(`${field.label ? `${plain(field.label).trim()}: ` : ""}${plain(field.text ?? "").trim()}`);
  return parts.join(" ");
}
function blockSpeech(block: ContentBlock): string {
  switch (block.type) {
    case "h2": case "h3": case "h4": case "scenario": return `${block.type === "scenario" ? "Scenario. " : ""}${plain(block.text).replace(/\.+$/, "")}.`;
    case "p": return plain(block.text.replace("{{sidebar}}", block.sidebar ? ` ${block.sidebar.title}. ${(block.sidebar.body ?? []).join(" ")} ` : ""));
    case "readaloud": return `Read aloud. ${plain(block.text)}`;
    case "synopsis": return `Synopsis. ${plain(block.text)}`;
    case "example": return plain(block.text);
    case "sidebar": return `${plain(block.title)}. ${(block.body ?? []).map(plain).join(" ")}`;
    case "procedure": return `${plain(block.title)}. ${block.steps.map((step, i) => `${i + 1}. ${plain(step)}`).join(" ")}`;
    case "list": return block.items.map(item => { const value = plain(item); return value + (/([.!?:])$/.test(item.trim()) ? "" : "."); }).join(" ");
    case "table": return block.rows.map(row => row.map((value, i) => ({ value, column: block.columns[i] })).filter(cell => cell.value && cell.column).map(cell => `${plain(cell.column!)}: ${plain(String(cell.value))}`).join("; ") + ".").join(" ");
    case "statblock": return statSpeech(block);
    case "endnotes": return "";
  }
}
function chapterSpeech(chapter: DocumentData["chapters"][number]): string {
  const part = chapter.part ? `${chapter.part.label ? `${chapter.part.label}: ` : ""}${chapter.part.title}. ` : "";
  return speechclean([`${part}${chapter.title.replace(/\.+$/, "")}.`, ...chapter.blocks.map(blockSpeech).map(text => text.trim()).filter(Boolean)].join(" "));
}

export async function writeNarration(document: DocumentData, root: string): Promise<void> {
  const intro = `${document.meta.title}. ${document.meta.subtitle}. ${document.meta.system}. “${document.meta.tagline}” This is an audiobook edition; tables and stat blocks are read as spoken lists, so keep the PDF nearby for reference during play. We begin.`;
  const chapters = document.chapters.map(chapterSpeech);
  const groups: Record<number, number[]> = { 1: [0, 1], 2: [2], 3: [3], 4: [4, 5], 5: [6], 6: [7], 7: [8], 8: [9], 9: [10, 11, 12] };
  const audioDir = `${root}/audio`;
  await mkdir(audioDir, { recursive: true });
  for (const [part, indexes] of Object.entries(groups)) {
    const text = indexes.map(index => chapters[index]).join(" ");
    await writeFile(`${audioDir}/part_${part}.txt`, `${part === "1" ? `${intro}\n\n` : ""}${text}`);
  }
  await writeFile(`${audioDir}/transcript.txt`, `${intro}\n\n${chapters.join("\n\n")}`);
}
