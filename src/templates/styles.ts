import type { ElementStyle } from "@vmprint/engine";

// VMPrint uses physical points throughout (72 pt per inch).
export const PAGE_SIZE = { width: 396, height: 612 };
export const PAGE_MARGIN = { top: 36, right: 36, bottom: 40, left: 36 };
export const CONTENT_WIDTH = PAGE_SIZE.width - PAGE_MARGIN.left - PAGE_MARGIN.right;
export const COLUMN_GAP = 12;
const heading: ElementStyle = { fontWeight: 700, textAlign: "left", keepWithNext: true, marginTop: 8, marginBottom: 4 };
const panel: ElementStyle = { backgroundColor: "#f2eee5", paddingLeft: 6, paddingRight: 6, marginBottom: 6, textAlign: "left", allowLineSplit: true };
export const styles: Record<string, ElementStyle> = {
  p: { marginBottom: 5, textAlign: "justify", allowLineSplit: true, orphans: 2, widows: 2 },
  lead: { fontSize: 8, marginBottom: 6, allowLineSplit: true },
  small: { fontSize: 6, marginBottom: 4, allowLineSplit: true },
  deriv: { fontSize: 6.5, marginBottom: 4, allowLineSplit: true },
  act: { fontWeight: 700, marginBottom: 4, allowLineSplit: true },
  chk: { fontStyle: "italic", marginBottom: 4, allowLineSplit: true },
  opening: { fontSize: 9, fontStyle: "italic", marginBottom: 10, textAlign: "left", allowLineSplit: true },
  // Full-width headings precede stories; keeping with an entire story forces an unnecessary page break.
  h1: { ...heading, fontSize: 20, marginBottom: 14, keepWithNext: false },
  h2: { ...heading, fontSize: 12, keepWithNext: false },
  h3: { ...heading, fontSize: 9 },
  h4: { ...heading, fontSize: 8 },
  scenario: { ...heading, fontSize: 10, borderBottomWidth: 0.5, borderBottomColor: "#8b3027", keepWithNext: false },
  readaloud: { ...panel, fontStyle: "italic" },
  synopsis: panel,
  example: { ...panel, fontSize: 6.5 },
  sidebar: { fontSize: 6, lineHeight: 1.3, textAlign: "left", paddingLeft: 6, borderLeftWidth: 0.5, borderLeftColor: "#9b8b72", marginBottom: 5, allowLineSplit: true },
  "list-item": { marginBottom: 3, allowLineSplit: true, textAlign: "left" },
  "table-cell": { fontSize: 6, padding: 3, textAlign: "left", borderBottomWidth: 0.3, borderBottomColor: "#c6bda9" },
  "stat-name": { ...heading, fontSize: 10, color: "#8b3027" },
  "stat-kind": { fontSize: 6, fontWeight: 700, marginBottom: 4 },
  "stat-desc": { fontSize: 6.5, fontStyle: "italic", marginBottom: 5, allowLineSplit: true },
  "stat-field": { fontSize: 6.5, marginBottom: 4, allowLineSplit: true, textAlign: "left" },
  legal: { fontSize: 6, marginBottom: 8, allowLineSplit: true },
  "cover-title": { fontSize: 32, fontWeight: 700, textAlign: "center", marginTop: 25, marginBottom: 20 },
  "cover-subtitle": { fontSize: 13, textAlign: "center", marginBottom: 18 },
  "cover-tagline": { fontSize: 10, fontStyle: "italic", textAlign: "center", marginBottom: 30 },
  "cover-system": { fontSize: 9, textAlign: "center" },
  "part-label": { fontSize: 12, textAlign: "center", marginTop: 140, marginBottom: 15 },
  "part-title": { fontSize: 26, textAlign: "center" },
  footer: { fontSize: 6, textAlign: "center" },
};
