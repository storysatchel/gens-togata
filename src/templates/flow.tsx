import type { ReactNode } from "react";
import { measure, type MeasureOptions } from "takumi-pdf";
import type { ContentBlock } from "../content/types";
import { inlinePattern } from "../inline/Inline";
import { Block, type Fragment } from "./blocks/Block";
import { CONTENT_HEIGHT, CONTENT_WIDTH } from "./page";

// Measured layout and the final render can differ by sub-pixel rounding; the slack keeps a full page from spilling a line onto a page of its own.
const PAGE_LIMIT = CONTENT_HEIGHT - 2;

export interface Piece { block: ContentBlock; key: string; id?: string; fragment: Fragment }
export type Segment =
  | { kind: "node"; key: string; node: ReactNode }
  | { kind: "full"; piece: Piece }
  | { kind: "band"; left: Piece[]; right: Piece[] };
// A laid-out page; `recto` (odd page) lets the stylesheet tell the outer side of the spread.
export interface PageLayout { segments: Segment[]; recto: boolean }
type Frame = (piece: Piece) => Segment;
type Fit = (pieces: Piece[]) => Promise<boolean>;

const full: Frame = piece => ({ kind: "full", piece });
const column: Frame = piece => ({ kind: "band", left: [piece], right: [] });
const band = (left: Piece[], right: Piece[]): Segment => ({ kind: "band", left, right });
const headingTypes: Record<string, true> = { h2: true, h3: true, h4: true, scenario: true };

function segmentKey(segment: Segment): string {
  switch (segment.kind) {
    case "node": return segment.key;
    case "full": return `f:${segment.piece.key}`;
    case "band": return `b:${segment.left.map(piece => piece.key).join(",")}|${segment.right.map(piece => piece.key).join(",")}`;
  }
}

function PieceView({ piece }: { piece: Piece }) {
  return <Block block={piece.block} id={piece.id} fragment={piece.fragment} />;
}

function SegmentView({ segment }: { segment: Segment }) {
  switch (segment.kind) {
    case "node": return segment.node;
    case "full": return <div className="fullw"><PieceView piece={segment.piece} /></div>;
    case "band": return <div className="column-layout">
      <div className="column column-left">{segment.left.map(piece => <PieceView key={piece.key} piece={piece} />)}</div>
      <div className="column column-right">{segment.right.map(piece => <PieceView key={piece.key} piece={piece} />)}</div>
    </div>;
  }
}

export function Page({ segments, recto }: PageLayout) {
  return <div className={recto ? "page recto" : "page verso"}>{segments.map(segment => <SegmentView key={segmentKey(segment)} segment={segment} />)}</div>;
}

// Whitespace a paragraph may break at: never inside an inline markup span.
function wordBreaks(text: string): { start: number; end: number }[] {
  const spans = [...text.matchAll(inlinePattern)].map(match => [match.index, match.index + match[0].length]);
  const breaks: { start: number; end: number }[] = [];
  for (const match of text.matchAll(/\s+/g)) {
    const start = match.index;
    const end = start + match[0].length;
    if (start === 0 || end === text.length || spans.some(([from, to]) => start > from && start < to)) continue;
    breaks.push({ start, end });
  }
  return breaks;
}

function unitCount(block: ContentBlock): number {
  switch (block.type) {
    case "p": return wordBreaks(block.text).length + 1;
    case "list": case "endnotes": return block.items.length;
    case "table": return block.rows.length;
    default: return 1;
  }
}

// Split a piece after its first `k` units (words, list items, table rows, notes).
function cut(piece: Piece, k: number): [Piece, Piece] {
  const block = piece.block;
  const fragment = piece.fragment;
  const head = (headBlock: ContentBlock, headFragment: Fragment): Piece => ({ block: headBlock, key: `${piece.key}<${k}`, id: piece.id, fragment: headFragment });
  const tail = (tailBlock: ContentBlock, tailFragment: Fragment): Piece => ({ block: tailBlock, key: `${piece.key}>${k}`, fragment: tailFragment });
  switch (block.type) {
    case "p": {
      const at = wordBreaks(block.text)[k - 1];
      return [head({ ...block, text: block.text.slice(0, at.start) }, { ...fragment, runsOn: true }), tail({ ...block, text: block.text.slice(at.end) }, { ...fragment, continued: true })];
    }
    case "list": return [head({ ...block, items: block.items.slice(0, k) }, fragment), tail({ ...block, items: block.items.slice(k) }, { ...fragment, continued: true })];
    case "table": return [head({ ...block, rows: block.rows.slice(0, k) }, fragment), tail({ ...block, rows: block.rows.slice(k) }, { ...fragment, continued: true })];
    case "endnotes": {
      const start = fragment.start ?? 1;
      return [head({ ...block, items: block.items.slice(0, k) }, fragment), tail({ ...block, items: block.items.slice(k) }, { ...fragment, continued: true, start: start + k })];
    }
    default: throw new Error(`Cannot split a ${block.type} block`);
  }
}

// Lays chapter content into explicit pages: column text fills the left column to the foot of the page, then the right, then the next page.
// It counts absolute page numbers so each page knows whether it is a recto; the stylesheet's sidebar layout depends on it.
export class Flow {
  private readonly heights = new Map<string, number>();
  private pageNumber: number;

  constructor(private readonly options: MeasureOptions, firstPage: number) {
    this.pageNumber = firstPage;
  }

  // Count a page laid out outside the flow (a part title page).
  skipPage() {
    this.pageNumber += 1;
  }

  private async pageHeight(segments: Segment[]): Promise<number> {
    const recto = this.pageNumber % 2 === 1;
    const key = `${recto ? "r" : "v"} ${segments.map(segmentKey).join(" ")}`;
    const cached = this.heights.get(key);
    if (cached !== undefined) return cached;
    const size = await measure(<div className="document" style={{ width: CONTENT_WIDTH, display: "flow-root" }}><Page segments={segments} recto={recto} /></div>, this.options);
    this.heights.set(key, size.height);
    return size.height;
  }

  private async fits(segments: Segment[]): Promise<boolean> {
    return await this.pageHeight(segments) <= PAGE_LIMIT;
  }

  // At least two lines on each side of a paragraph break.
  private async multiLine(piece: Piece, frame: Frame): Promise<boolean> {
    if (piece.block.type !== "p") return true;
    const probe: Piece = { ...piece, block: { ...piece.block, text: "x" }, key: `${piece.key}~1` };
    return await this.pageHeight([frame(piece)]) > await this.pageHeight([frame(probe)]) + 0.5;
  }

  private async splitToFit(piece: Piece, fit: (head: Piece) => Promise<boolean>, frame: Frame): Promise<[Piece, Piece] | null> {
    const units = unitCount(piece.block);
    if (units < 2) return null;
    let lo = 0;
    let hi = units - 1;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (await fit(cut(piece, mid)[0])) lo = mid;
      else hi = mid - 1;
    }
    for (let k = lo; k >= 1; k--) {
      const [head, tail] = cut(piece, k);
      if (!await this.multiLine(tail, frame)) continue;
      return await this.multiLine(head, frame) ? [head, tail] : null;
    }
    return null;
  }

  // Greedily fill one column; returns the column and what is left over.
  private async fillColumn(pieces: Piece[], fit: Fit): Promise<[Piece[], Piece[]]> {
    const col: Piece[] = [];
    let rest = pieces;
    while (rest.length > 0) {
      const [next, ...after] = rest;
      if (await fit([...col, next])) { col.push(next); rest = after; continue; }
      const split = await this.splitToFit(next, head => fit([...col, head]), column);
      if (split) { col.push(split[0]); rest = [split[1], ...after]; }
      break;
    }
    // Keep headings with the text they introduce.
    while (rest.length > 0 && col.length > 1 && headingTypes[col[col.length - 1].block.type]) rest = [col.pop()!, ...rest];
    return [col, rest];
  }

  // The shortest two-column band holding all of `run`, if it fits on the page.
  private async balance(run: Piece[], page: Segment[]): Promise<Segment | null> {
    const single = await this.pageHeight([band(run, [])]);
    const available = PAGE_LIMIT - await this.pageHeight(page);
    if (single / 2 > available + 12) return null;
    const attempt = async (height: number): Promise<Segment | null> => {
      const [left, afterLeft] = await this.fillColumn(run, async col => await this.pageHeight([band(col, [])]) <= height);
      if (left.length === 0) return null;
      const [right, rest] = await this.fillColumn(afterLeft, async col => await this.pageHeight([band([], col)]) <= height);
      return rest.length === 0 ? band(left, right) : null;
    };
    let best = await attempt(single);
    if (!best) return null;
    let lo = Math.floor(single / 2) - 1;
    let hi = single;
    while (hi - lo > 1) {
      const mid = (lo + hi) / 2;
      const candidate = await attempt(mid);
      if (candidate) { best = candidate; hi = mid; } else lo = mid;
    }
    return await this.fits([...page, best]) ? best : null;
  }

  async paginate(lead: Segment[], entries: { piece: Piece; full: boolean }[]): Promise<PageLayout[]> {
    const pages: PageLayout[] = [];
    let page: Segment[] = [...lead];
    // Close the page, counting any pages the renderer adds to break content taller than a page.
    const closePage = async (segments: Segment[]) => {
      pages.push({ segments, recto: this.pageNumber % 2 === 1 });
      this.pageNumber += Math.max(1, Math.ceil(await this.pageHeight(segments) / CONTENT_HEIGHT));
    };
    const breakPage = async () => {
      const carried: Segment[] = [];
      while (page.length > 1) {
        const last = page[page.length - 1];
        if (last.kind !== "full" || !headingTypes[last.piece.block.type]) break;
        carried.unshift(page.pop()!);
      }
      await closePage(page);
      page = carried;
    };

    const placeFull = async (piece: Piece) => {
      let current = piece;
      for (;;) {
        if (await this.fits([...page, full(current)])) { page.push(full(current)); return; }
        const split = await this.splitToFit(current, head => this.fits([...page, full(head)]), full);
        if (split) { page.push(full(split[0])); await breakPage(); current = split[1]; continue; }
        // Taller than a whole page: the renderer breaks it.
        if (page.length === 0) { page.push(full(current)); return; }
        await breakPage();
      }
    };

    const placeRun = async (run: Piece[]) => {
      let rest = run;
      while (rest.length > 0) {
        const settled = await this.balance(rest, page);
        if (settled) { page.push(settled); return; }
        const [left, afterLeft] = await this.fillColumn(rest, col => this.fits([...page, band(col, [])]));
        if (left.length === 0) {
          if (page.length > 0) { await breakPage(); continue; }
          // Taller than a whole column: the renderer breaks it.
          page.push(band([rest[0]], []));
          rest = rest.slice(1);
          await breakPage();
          continue;
        }
        const [right, remaining] = await this.fillColumn(afterLeft, col => this.fits([...page, band(left, col)]));
        page.push(band(left, right));
        rest = remaining;
        if (rest.length > 0) await breakPage();
      }
    };

    for (let i = 0; i < entries.length;) {
      if (entries[i].full) { await placeFull(entries[i].piece); i++; continue; }
      let j = i;
      while (j < entries.length && !entries[j].full) j++;
      await placeRun(entries.slice(i, j).map(entry => entry.piece));
      i = j;
    }
    if (page.length > 0) await closePage(page);
    return pages;
  }
}
