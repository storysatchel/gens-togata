import { Inline } from "../../inline/Inline";
import type { TableBlock, StatBlock } from "../../content/types";

export function DataTable({ block }: { block: TableBlock }) {
  const className = block.style === "motiv" ? "gear motiv" : "gear";
  return <table className={className}><thead><tr>{block.columns.map((col, i) => <th key={i}><Inline text={col} /></th>)}</tr></thead><tbody>{block.rows.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci}><Inline text={String(cell ?? "")} /></td>)}</tr>)}</tbody></table>;
}

export function Statblock({ block }: { block: StatBlock }) {
  const chars = block.chars ?? {};
  const derived = block.derived ?? {};
  return <section className="statblock">
    <span className="nm"><Inline text={block.name ?? ""} /></span>{block.kind && <> <span className="typ">(<Inline text={block.kind} />)</span></>}<br />
    {block.desc && <div className="small"><Inline text={block.desc} /></div>}
    {Object.keys(chars).length > 0 && <table className="chars"><thead><tr>{[...Object.keys(chars), ...Object.keys(derived)].map((key, i) => <th key={i}>{key}</th>)}</tr></thead><tbody><tr>{[...Object.values(chars), ...Object.values(derived)].map((value, i) => <td key={i}>{String(value)}</td>)}</tr></tbody></table>}
    {(block.fields ?? []).map((field, i) => <p className="deriv" key={i}>{field.label && <><strong><Inline text={field.label} />: </strong></>}<Inline text={field.text ?? ""} /></p>)}
  </section>;
}
