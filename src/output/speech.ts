import { mkdir, writeFile } from "node:fs/promises";
import type { Element } from "@vmprint/engine";
import type { DocumentData } from "../content/types";

function speechclean(text: string): string {
  const replacements: Array<[string, string]> = [["HS", "sesterces"], [" HP:", " Hard Points:"], ["Price/Rarity", "price and rarity"], ["(R, military)", "rare, military only"], ["(R)", "rare"]];
  for (const [a, b] of replacements) text = text.replaceAll(a, b);
  text = text.replace(/&/g, "and");
  const patterns: Array<[RegExp, string]> = [[/\bXP\b/g, "experience points"], [/\bGMs\b/g, "Game Masters"], [/\bGM\b/g, "Game Master"], [/\bPCs\b/g, "player characters"], [/\bPC\b/g, "player character"], [/\bEnc\b/g, "Encumbrance"], [/\bDam\b/g, "Damage"], [/\bCrit\b/g, "Critical"], [/\bSil\b/g, "Silhouette"], [/\bd10\b/g, "d-ten"], [/\bc\.\s/g, "circa "]];
  for (const [pattern, replacement] of patterns) text = text.replace(pattern, replacement);
  return text.replace(/price and rarity: ([\d,]+) [/ ]*(\w+)/g, "price $1 sesterces, rarity $2").replace(/\s+([,.!?;:)])/g, "$1").replace(/\s+/g, " ").trim();
}

function role(element: Element): string { return element.properties?.semanticRole ?? ""; }
function omitted(element: Element): boolean {
  return ["notes", "note", "note-ref", "decoration"].includes(role(element)) || ["image", "rule", "spacer"].includes(element.type);
}

// Inline children are runs, not separately spaced blocks. Their semantic roles,
// rather than their font-specific glyphs, determine what is spoken.
function inlineSpeech(element: Element): string {
  if (omitted(element)) return "";
  const semantic = role(element);
  if (semantic.startsWith("dice:") || semantic.startsWith("result:")) return ` ${semantic.slice(semantic.indexOf(":") + 1)} `;
  return element.children?.length ? element.children.map(inlineSpeech).join("") : element.content ?? "";
}

function sentence(text: string): string {
  const value = text.trim();
  return value && !/[.!?:]$/.test(value) ? `${value}.` : value;
}

function tableSpeech(element: Element): string {
  const [header, ...rows] = element.children ?? [];
  const headers = (header?.children ?? []).map(cell => inlineSpeech(cell).trim());
  return rows.map(row => sentence((row.children ?? []).map((cell, column) => [headers[column], inlineSpeech(cell).trim()] as const)
    .filter(([, text]) => text).map(([heading, text]) => heading ? `${heading}: ${text}` : text).join("; "))).filter(Boolean).join(" ");
}

function blockSpeech(element: Element): string {
  if (omitted(element)) return "";
  if (element.type === "table") return tableSpeech(element);
  if (element.type === "list" && element.list?.kind === "ordered") {
    const start = Number(element.list.start ?? 1);
    return (element.children ?? []).map((item, index) => {
      const spoken = blockSpeech(item);
      return spoken ? `${start + index}. ${spoken}` : "";
    }).filter(Boolean).join(" ");
  }
  if (element.type === "story" || element.type === "list") return (element.children ?? []).map(blockSpeech).filter(Boolean).join(" ");
  const { partLabel, partTitle } = element.properties ?? {};
  if (role(element) === "part" && typeof partTitle === "string") return sentence(`${typeof partLabel === "string" && partLabel ? `${partLabel}: ` : ""}${partTitle}`);
  const value = inlineSpeech(element).trim();
  if (!value) return "";
  if (["h1", "h2", "h3", "h4", "scenario", "list-item", "stat-name", "sidebar"].includes(element.type)) {
    return `${element.type === "scenario" ? "Scenario. " : ""}${sentence(value)}`;
  }
  if (element.type === "stat-kind") return `(${value}).`;
  if (element.type === "readaloud") return `Read aloud. ${value}`;
  return value;
}

export async function writeNarration(document: DocumentData, root: string): Promise<void> {
  const { title, subtitle, system, tagline } = document.meta;
  const intro = `${title}. ${subtitle}. ${system}. “${tagline}” This is an audiobook edition; tables and stat blocks are read as spoken lists, so keep the PDF nearby for reference during play. We begin.`;
  const chapters: string[][] = [[]];
  const groups = new Map<number, string[]>();
  let part = 1, lead: string[] = [], afterPart = false;
  for (const element of document.elements) {
    const kind = role(element);
    if (kind === "part" || (kind === "chapter" && !afterPart)) chapters.push([]);
    afterPart = kind === "part" || (afterPart && kind !== "chapter");
    const text = blockSpeech(element);
    if (text) chapters.at(-1)!.push(text);
    // A part title is spoken with the first chapter that follows it, in that chapter's audio group.
    if (kind === "part" || (lead.length && kind !== "chapter")) { if (text) lead.push(text); continue; }
    if (kind === "chapter") part = element.properties!.audioPart;
    groups.set(part, [...(groups.get(part) ?? []), ...lead, ...(text ? [text] : [])]);
    lead = [];
  }
  const audioDir = `${root}/audio`;
  await mkdir(audioDir, { recursive: true });
  for (const [number, group] of groups) await writeFile(`${audioDir}/part_${number}.txt`, `${number === 1 ? `${intro}\n\n` : ""}${speechclean(group.join(" "))}`);
  await writeFile(`${audioDir}/transcript.txt`, `${intro}\n\n${chapters.filter(chapter => chapter.length).map(chapter => speechclean(chapter.join(" "))).join("\n\n")}`);
}
