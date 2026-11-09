import type { ReactNode } from "react";
import { measure, type MeasureOptions } from "takumi-pdf";
import type { ContentBlock } from "../content/types";
import { inlinePattern } from "../inline/Inline";
import { Block, type Fragment } from "./blocks/Block";
import { CONTENT_HEIGHT, CONTENT_WIDTH } from "./page";

// Measured layout and the final render can differ by sub-pixel rounding; the slack keeps a full page from spilling a line onto a page of its own.
const PAGE_LIMIT = CONTENT_HEIGHT - 2;
// A heading group rides to the next page only while it stays under a fifth of the page (~107 pt): a heading and a short
// lead-in are worth the break, real body text is not — the hole it leaves would match the stranding it prevents.
const KEEP_GROUP_LIMIT = CONTENT_HEIGHT / 5;

export interface Piece { block: ContentBlock; key: string; id?: string; fragment: Fragment }
export interface Piece { block: ContentBlock; key: string; id?: string; fragment: Fragment }
export interface Piece { block: ContentBlock; key: string; id?: string; fragment: Fragment }
export interface Piece { block: ContentBlock; key: string; id?: string; fragment: Fragment }
export interface Piece { block: ContentBlock; key: string; id?: string; fragment: Fragment }
export type Segment =
  | { kind: "node"; key: string; node: ReactNode }
  | { kind: "full"; piece: Piece }
  | { kind: "band"; left: Piece[]; right: Piece[] };
// A laid-out page; `recto` (odd page) lets the stylesheet tell the outer side of the spread.
export interface PageLayout { segments: Segment[]; recto: boolean }
export interface PageLayout { segments: Segment[]; recto: boolean }
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
    // A full-bleed plate positions itself against the page box, so the .fullw
    // wrapper's vertical margins would offset it by a few pixels.
    case "full": return segment.piece.block.type === "full-bleed"
      ? <PieceView piece={segment.piece} />
      : <div className="fullw"><PieceView piece={segment.piece} /></div>;
    case "band":
      if (segment.right.length === 0) {
        return segment.left.map(piece => <PieceView key={piece.key} piece={piece} />);
      }
      return <div className="column-layout">
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
    case "full-bleed": case "vignette": return 1;
    case "spot": return 0;
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
    case "full-bleed": case "vignette": case "spot": throw new Error(`Cannot split a ${block.type} block`);
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

  // Would the trailing segment at `index` ride to the next page with the block it introduces? A bare heading always
  // does. A heading's lead-in paragraph, or the column that it opens, does only while the whole heading group — plus
  // whatever already left with it — measures under KEEP_GROUP_LIMIT.
  private async keepsWithNext(page: Segment[], index: number, carried: Segment[]): Promise<boolean> {
    const last = page[index];
    if (last.kind === "node") return false;
    if (last.kind === "full" && headingTypes[last.piece.block.type]) return true;
    if (last.kind === "band") {
      const first = last.left[0];
      if (!first || !headingTypes[first.block.type]) return false;
      return await this.pageHeight([...page.slice(index), ...carried]) <= KEEP_GROUP_LIMIT;
    }
    if (last.piece.block.type !== "p" || index === 0) return false;
    const opener = page[index - 1];
    if (opener.kind !== "full" || !headingTypes[opener.piece.block.type]) return false;
    return await this.pageHeight([...page.slice(index - 1), ...carried]) <= KEEP_GROUP_LIMIT;
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
    // The page that received nothing but the heading group the last break carried; if it stays that way the carry was
    // pointless and the group goes back where it came from.
    let carriedOnly: { segments: Segment[]; length: number } | null = null;
    const add = (segment: Segment) => { page.push(segment); carriedOnly = null; };
    // Close the page, counting any pages the renderer adds to break content taller than a page.
    const closePage = async (segments: Segment[]) => {
      pages.push({ segments, recto: this.pageNumber % 2 === 1 });
      this.pageNumber += Math.max(1, Math.ceil(await this.pageHeight(segments) / CONTENT_HEIGHT));
    };
    const breakPage = async () => {
      if (carriedOnly && page === carriedOnly.segments && page.length === carriedOnly.length && pages.length > 0) {
        pages[pages.length - 1].segments.push(...page);
        page = [];
        carriedOnly = null;
        return;
      }
      const carried: Segment[] = [];
      while (page.length > 1) {
        if (!await this.keepsWithNext(page, page.length - 1, carried)) break;
        const leaving = page.pop()!;
        carried.unshift(leaving);
        // One group only: a heading-led column carries alone, without the run that follows it.
        if (leaving.kind === "band") break;
      }
      // A heading never ends a page on its own; if its group is leaving, it leaves too.
      const last = page[page.length - 1];
      if (carried.length > 0 && last?.kind === "full" && headingTypes[last.piece.block.type]) carried.unshift(page.pop()!);
      // Leaving another heading group at the foot strands it in place of the one that left: keep both.
      if (carried.length > 0 && page.length > 0 && await this.keepsWithNext(page, page.length - 1, [])) { page.push(...carried); carried.length = 0; }
      // Carrying the whole page would reopen it unchanged; close it as it stands instead.
      if (page.length === 0) { page = carried.slice(); carried.length = 0; }
      await closePage(page);
      page = carried;
      carriedOnly = carried.length > 0 ? { segments: carried, length: carried.length } : null;
    };

    const placeFull = async (piece: Piece) => {
      let current = piece;
      for (;;) {
        if (await this.fits([...page, full(current)])) { add(full(current)); return; }
        const split = await this.splitToFit(current, head => this.fits([...page, full(head)]), full);
        if (split) { add(full(split[0])); await breakPage(); current = split[1]; continue; }
        // Taller than a whole page: the renderer breaks it.
        if (page.length === 0) { add(full(current)); return; }
        await breakPage();
      }
    };

    const placeRun = async (run: Piece[]) => {
      // Check if the run contains any image blocks that need single-column flow
      const hasImageBlocks = run.some(block =>
        block.block.type === 'vignette' || block.block.type === 'spot'
      );

      if (hasImageBlocks) {
        // Single-column layout for image blocks
        let rest = run;
        while (rest.length > 0) {
          // Fit as many blocks as possible in a single column
          let col: Piece[] = [];
          while (col.length < rest.length) {
            const candidate = [...col, rest[col.length]];
            if (!this.fits([...page, band(candidate, [])])) break;
            col = candidate;
          }
          if (col.length === 0) {
            if (page.length > 0) { await breakPage(); continue; }
            // Taller than a whole column: the renderer breaks it.
            page.push(band([rest[0]], []));
            rest = rest.slice(1);
            await breakPage();
            continue;
          }
          page.push(band(col, []));
          rest = rest.slice(col.length);
          if (rest.length > 0) await breakPage();
        }
        return;
      }

      // Existing two-column balance for non-image content
      let rest = run;
      while (rest.length > 0) {
        const settled = await this.balance(rest, page);
        if (settled) { add(settled); return; }
        const [left, afterLeft] = await this.fillColumn(rest, col => this.fits([...page, band(col, [])]));
        if (left.length === 0) {
          if (page.length > 0) { await breakPage(); continue; }
          // Taller than a whole column: the renderer breaks it.
          add(band([rest[0]], []));
          rest = rest.slice(1);
          await breakPage();
          continue;
        }
        const [right, remaining] = await this.fillColumn(afterLeft, col => this.fits([...page, band(left, col)]));
        add(band(left, right));
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
