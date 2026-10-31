import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { Flow, type Piece } from "../src/templates/flow";
import { documentAssets } from "../src/templates/Document";
import { PAGE_SIZE } from "../src/templates/page";

// A long paragraph must remain intact as its inline sidebar crosses column/page boundaries.
test("an anchored sidebar stays with its paragraph when columns split", async () => {
  const css = await readFile("styles.css", "utf8");
  const assets = await documentAssets(process.cwd());
  for (const firstPage of [1, 2]) {
    for (const position of [20, 220, 500]) {
      const words = Array.from({ length: 700 }, (_, i) => `word${i}`);
      words.splice(position, 0, "{{sidebar}}");
      const text = words.join(" ");
      const piece: Piece = {
        key: `${firstPage}-${position}`,
        block: { type: "p", text, sidebar: { type: "sidebar", title: "Sidebar", body: ["Sidebar content."] } },
        fragment: {},
      };
      const flow = new Flow({ size: PAGE_SIZE, css, fonts: assets.fonts, images: assets.images, fontFamilies: assets.fontFamilies, lang: "en" }, firstPage);
      const pages = await flow.paginate([], [{ piece, full: false }]);
      const fragments = pages.flatMap(page => page.segments.flatMap(segment => segment.kind === "band" ? [...segment.left, ...segment.right] : segment.kind === "full" ? [segment.piece] : []));
      const reconstructed = fragments.map(fragment => fragment.block.type === "p" ? fragment.block.text : "").join(" ");
      expect(pages.length).toBeGreaterThan(1);
      expect(reconstructed).toBe(text);
      const anchored = fragments.filter(fragment => fragment.block.type === "p" && fragment.block.text.includes("{{sidebar}}"));
      expect(anchored).toHaveLength(1);
      expect(anchored[0].block.type === "p" && anchored[0].block.sidebar?.title).toBe("Sidebar");
      expect(reconstructed.match(/\{\{sidebar\}\}/g)).toHaveLength(1);
    }
  }
});
