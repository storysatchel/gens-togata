import type { ReactNode } from "react";

const symbols: Record<string, string> = { advantage: "a", success: "s", triumph: "t", threat: "h", failure: "f", despair: "d" };
const dice: Record<string, [string, string]> = { boost: ["j", "boost"], setback: ["j", "setback"], difficulty: ["k", "difficulty"], ability: ["k", "ability"], proficiency: ["l", "proficiency"], challenge: ["l", "challenge"] };
const diceWords = new Set([...Object.keys(symbols), ...Object.keys(dice)]);

function marked(token: string, key: number): ReactNode {
  const words = token.trim().split(/\s+/);
  if (words.length && words.every(word => diceWords.has(word.toLowerCase()))) {
    return words.map((word, index) => {
      const name = word.toLowerCase();
      const symbol = symbols[name];
      const die = dice[name];
      const character = symbol ?? die[0];
      const color = die?.[1];
      return <span key={`${key}-${index}`} className={`gly${color ? ` ${color}` : ""}`} aria-label={name}>{character}</span>;
    });
  }
  return <span key={key} className="tag">{token}</span>;
}

// Inline markup spans; text must not be split inside one.
export const inlinePattern = /(\[\[(.+?)\]\]|\{\{(\d+)\}\}|●|\*\*(.+?)\*\*|\*(.+?)\*)/gs;

export function Inline({ text }: { text: string }): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(inlinePattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    if (match[2] !== undefined) parts.push(marked(match[2], index));
    else if (match[3] !== undefined) parts.push(<sup key={index} className="en">{match[3]}</sup>);
    else if (match[0] === "●") parts.push(<span key={index} className="gly difficulty" aria-label="difficulty">k</span>);
    else if (match[4] !== undefined) parts.push(<strong key={index}>{match[4]}</strong>);
    else parts.push(<em key={index}>{match[5]}</em>);
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
