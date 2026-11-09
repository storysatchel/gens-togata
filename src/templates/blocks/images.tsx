import type { ReactNode } from "react";
import { Inline } from "../../inline/Inline";
import type { FullBleedImageBlock, VignetteBlock, SpotImageBlock } from "../../content/types";

export function FullBleedImage({ block }: { block: FullBleedImageBlock }) {
  return <figure className="full-bleed-image">
    <img src={block.src} alt={block.alt ?? ""} />
    {block.caption && <figcaption><Inline text={block.caption} /></figcaption>}
  </figure>;
}

export function Vignette({ block, textBefore, textAfter }: { block: VignetteBlock; textBefore?: ReactNode; textAfter?: ReactNode }) {
  return (
    <div className="vignette-wrap">
      <div className="vignette-image">
        <img src={block.src} alt={block.alt ?? ""} />
        {block.caption && <figcaption><Inline text={block.caption} /></figcaption>}
      </div>
      <div className="vignette-text">
        {textBefore}
        {textAfter}
      </div>
    </div>
  );
}

export function SpotImage({ block }: { block: SpotImageBlock }) {
  const floatClass = block.float && block.float !== "none" ? `float-${block.float}` : "";
  const widthStyle = block.width ? { width: `${block.width}px` } : undefined;
  return <figure className={`spot-image ${floatClass}`} style={widthStyle}>
    <img src={block.src} alt={block.alt ?? ""} />
    {block.caption && <figcaption><Inline text={block.caption} /></figcaption>}
  </figure>;
}