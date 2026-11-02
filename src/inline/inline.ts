import type { Element, ElementStyle } from "@vmprint/engine";

const symbols: Record<string, string> = { advantage: "a", success: "s", triumph: "t", threat: "h", failure: "f", despair: "d" };
const dice: Record<string, [string, string]> = {
  boost: ["j", "#1f8f80"], setback: ["j", "#231f20"], difficulty: ["k", "#552c7f"],
  ability: ["k", "#2e8b43"], proficiency: ["l", "#b99400"], challenge: ["l", "#771214"],
};
const diceWords = new Set([...Object.keys(symbols), ...Object.keys(dice)]);
const glyphStyle: ElementStyle = {
  fontFamily: "Genesys", fontStyle: "normal", fontWeight: "normal",
  fontSize: 8.05, baselineShift: -0.56, letterSpacing: 0.375,
};

// Keep complete nested spans together, including shared closing runs (***).
const inlinePattern = /(\[\[(.+?)\]\]|\{\{(\d+)\}\}|●|\*\*((?:[^*]|\*(?!\*)[^*]+\*)+?)\*\*|\*((?:\*\*[^*]+\*\*|[^*])+?)\*(?!\*)|\{\{sidebar\}\})/gs;

/** Normalize authored markup into VMPrint text runs; sidebar placement belongs to the parent block. */
export function inline(text: string): Element[] {
  const runs: Element[] = [];
  function push(content: string, style: ElementStyle): void {
    if (!content) return;
    runs.push(Object.keys(style).length
      ? { type: "text", content, properties: { style } }
      : { type: "text", content });
  }
  function glyph(name: string, style: ElementStyle): void {
    const die = dice[name];
    push(symbols[name] ?? die![0], { ...style, ...glyphStyle, ...(die ? { color: die[1] } : {}) });
  }
  function parse(value: string, style: ElementStyle): void {
    let last = 0;
    for (const match of value.matchAll(inlinePattern)) {
      const index = match.index;
      push(value.slice(last, index), style);
      if (match[2] !== undefined) {
        const words = match[2].trim().split(/\s+/);
        if (words.every(word => diceWords.has(word.toLowerCase()))) {
          for (const word of words) glyph(word.toLowerCase(), style);
        } else {
          push(match[2], { ...style, fontWeight: "bold", color: "#8a5a12" });
        }
      } else if (match[3] !== undefined) {
        push(match[3], { ...style, fontSize: 4.48, baselineShift: 2.8, inlineMarginLeft: 0.3, color: "#8a5a12", fontWeight: "bold" });
      } else if (match[0] === "●") {
        glyph("difficulty", style);
      } else if (match[4] !== undefined) {
        parse(match[4], { ...style, fontWeight: "bold" });
      } else if (match[5] !== undefined) {
        parse(match[5], { ...style, fontStyle: "italic" });
      }
      last = index + match[0].length;
    }
    push(value.slice(last), style);
  }
  parse(text, {});
  return runs;
}
