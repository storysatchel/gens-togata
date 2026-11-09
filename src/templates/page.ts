// Page geometry in CSS px (96/in): 5.5in × 8.5in.
export const PAGE_SIZE = { width: 528, height: 816 };
export const PAGE_MARGIN = { top: 48, right: 48, bottom: 53, left: 48 };
// The renderer clips to its margin box, so the PDF is rendered with side margins narrowed by this much and the document
// padded back in, leaving room for sidebars (styles.css) to hang into the outer margin. Keep it ≥ their hang.
export const SIDEBAR_HANG = 30;
export const CONTENT_WIDTH = PAGE_SIZE.width - PAGE_MARGIN.left - PAGE_MARGIN.right;
export const CONTENT_HEIGHT = PAGE_SIZE.height - PAGE_MARGIN.top - PAGE_MARGIN.bottom;
