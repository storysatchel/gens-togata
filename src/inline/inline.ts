import type { Element, ElementStyle } from "@vmprint/engine";
const symbols: Record<string, string> = { advantage: "a", success: "s", triumph: "t", threat: "h", failure: "f", despair: "d" };
/** Genesys glyph codes in the Genesys font; appearance (font, colour, size) is the theme's, selected by semantic role. */
const dice: Record<string, string> = { boost: "j", setback: "j", difficulty: "k", ability: "k", proficiency: "l", challenge: "l" };
const diceWords = new Set([...Object.keys(symbols), ...Object.keys(dice)]);

// Keep complete nested spans together, including shared closing runs (***).
const inlinePattern = /(\[\[(.+?)\]\]|\{\{(\d+)\}\}|●|\*\*((?:[^*]|\*(?!\*)[^*]+\*)+?)\*\*|\*((?:\*\*[^*]+\*\*|[^*])+?)\*(?!\*)|\{\{sidebar\}\})/gs;

/** Normalize authored markup into VMPrint text runs; sidebar placement belongs to the parent block. */
export function inline(text: string): Element[] {
  const runs: Element[] = [];
  function push(content: string, style: ElementStyle, semanticRole?: string): void {
    if (!content) return;
    const properties = {
      ...(Object.keys(style).length ? { style } : {}),
      ...(semanticRole ? { semanticRole } : {}),
    };
    runs.push(Object.keys(properties).length
      ? { type: "text", content, properties }
      : { type: "text", content });
  }
  function glyph(name: string, style: ElementStyle): void {
    const die = dice[name];
    push(symbols[name] ?? die!, style, `${die ? "dice" : "result"}:${name}`);
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
          push(match[2], style, "keyword");
        }
      } else if (match[3] !== undefined) {
        push(match[3], style, "note-ref");
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
