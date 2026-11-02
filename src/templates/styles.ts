import type { ElementStyle } from "@vmprint/engine";

// VMPrint uses physical points throughout (72 pt per inch).
const pageSize = { width: 396, height: 612 };
const margins = { top: 36, right: 36, bottom: 40, left: 36 };
const geometry = {
  pageSize,
  margins,
  contentWidth: pageSize.width - margins.left - margins.right,
};
const typography = {
  fontFamily: "Libre Baskerville",
  fontSize: 7,
  lineHeight: 1.4,
  lang: "en",
};
const colors = {
  panel: "#f2eee5",
  accent: "#8b3027",
  sidebarBorder: "#9b8b72",
  tableBorder: "#c6bda9",
  tableHeader: "#e6dece",
  annotation: "#8a5a12",
  dice: {
    boost: "#1f8f80",
    setback: "#231f20",
    difficulty: "#552c7f",
    ability: "#2e8b43",
    proficiency: "#b99400",
    challenge: "#771214",
  },
} as const;
const glyph: ElementStyle = {
  fontFamily: "Genesys", fontStyle: "normal", fontWeight: "normal",
  fontSize: 8.05, baselineShift: -0.56, letterSpacing: 0.375,
};
const note: ElementStyle = { fontSize: 4.48, baselineShift: 2.8, inlineMarginLeft: 0.3, color: colors.annotation, fontWeight: "bold" };
const keyword: ElementStyle = { fontWeight: "bold", color: colors.annotation };
const table = {
  statCellStyle: { fontSize: 4.2, paddingTop: 1.5, paddingBottom: 1.5, paddingLeft: 0.5, paddingRight: 0.5, textAlign: "center" },
} satisfies { statCellStyle: ElementStyle };

const heading: ElementStyle = { fontWeight: 700, textAlign: "left", keepWithNext: true, marginTop: 8, marginBottom: 4 };
const panel: ElementStyle = { backgroundColor: colors.panel, paddingLeft: 6, paddingRight: 6, marginBottom: 6, textAlign: "left", allowLineSplit: true };

const styles = {
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
  scenario: { ...heading, fontSize: 10, borderBottomWidth: 0.5, borderBottomColor: colors.accent, keepWithNext: false },
  readaloud: { ...panel, fontStyle: "italic" },
  synopsis: panel,
  example: { ...panel, fontSize: 6.5 },
  sidebar: { fontSize: 6, lineHeight: 1.3, textAlign: "left", paddingLeft: 6, borderLeftWidth: 0.5, borderLeftColor: colors.sidebarBorder, marginBottom: 5, allowLineSplit: true },
  "list-item": { marginBottom: 3, allowLineSplit: true, overflowPolicy: "move-whole", textAlign: "left" },
  "table-cell": { fontSize: 6, padding: 3, textAlign: "left", borderBottomWidth: 0.3, borderBottomColor: colors.tableBorder },
  "stat-name": { ...heading, fontSize: 10, color: colors.accent },
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
} satisfies Record<string, ElementStyle>;

/** The book's layout and visual vocabulary, independent of any output adapter. */
export const bookTheme = {
  name: "Gens Togata",
  geometry,
  typography,
  colors,
  note,
  keyword,
  glyph,
  table,
  styles,
} as const;

