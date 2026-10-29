import { Inline } from "../../inline/Inline";
import type { TableBlock, StatBlock } from "../../content/types";

export function DataTable({ block }: { block: TableBlock }) {
  const className = block.style === "motiv" ? "gear motiv" : "gear";
  return <table className={className}><thead><tr>{block.columns.map((col, i) => <th key={i}><Inline text={col} /></th>)}</tr></thead><tbody>{block.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}><Inline text={String(cell ?? "")} /></td>)}</tr>)}</tbody></table>;
}

const characteristicOrder = [
  ["Br", "Brawn"],
  ["Ag", "Agility"],
  ["Int", "Intellect"],
  ["Cun", "Cunning"],
  ["Will", "Willpower"],
  ["Pr", "Presence"],
] as const;

const derivedLabels: Record<string, string> = {
  Soak: "Soak Value",
  "W.T.": "Wound Threshold",
  "S.T.": "Strain Threshold",
  Def: "Defense",
};

export function Statblock({ block }: { block: StatBlock }) {
  const chars = block.chars ?? {};
  const characteristics = [
    ...characteristicOrder
      .filter(([key]) => key in chars)
      .map(([key, label]) => ({ label, value: chars[key] })),
    ...Object.entries(chars)
      .filter(([key]) => !characteristicOrder.some(([abbr]) => abbr === key))
      .map(([label, value]) => ({ label, value })),
  ];
  const derived = Object.entries(block.derived ?? {}).map(([key, value]) => ({
    label: derivedLabels[key] ?? key,
    note: key === "Def (M/R)" ? "Melee / Ranged" : undefined,
    value: key === "Def (M/R)" ? String(value).replace("/", " / ") : String(value),
  }));

  return <section className="statblock adversary-profile">
    <header className="adv-header">
      <h2 className="adv-name"><Inline text={block.name ?? ""} /></h2>
      {block.kind && <span className="adv-kind"><Inline text={block.kind} /></span>}
    </header>
    {block.desc && <p className="adv-flavor"><Inline text={block.desc} /></p>}
    {characteristics.length > 0 && <table className="adv-characteristics">
      <tbody><tr>{characteristics.map(({ label, value }) => <td key={label}>
        <span className="adv-char-value">{String(value)}</span>
        <span className="adv-char-label">{label}</span>
      </td>)}</tr></tbody>
    </table>}
    {derived.length > 0 && <div className="adv-derived">
      {derived.map(({ label, note, value }) => <div className="adv-derived-item" key={label}>
        <div className="adv-derived-label"><Inline text={label} /></div>
        <div className="adv-derived-value">{note && <span className="adv-derived-note">{note}</span>}{value}</div>
      </div>)}
    </div>}
    {(block.fields ?? []).length > 0 && <div className="adv-details">
      {(block.fields ?? []).map((field, i) => <p className="adv-detail" key={i}>
        {field.label && <strong className="adv-detail-label"><Inline text={field.label} />: </strong>}
        <Inline text={field.text ?? ""} />
      </p>)}
    </div>}
  </section>;
}
