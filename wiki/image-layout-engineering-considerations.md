# Image Layout: Engineering Considerations

## Data Structure Types

```yaml
# Full-bleed image
{
  type: "full-bleed",
  src: "path/to/image.png",
  caption: "Optional caption",
  alt: "Alternative text",
  bleed: 0.125  # inches
}

# Vignette (half-page)
{
  type: "vignette",
  src: "path/to/image.png",
  caption: "Optional caption",
  alt: "Alternative text",
  position: "top" | "bottom" | "left" | "right"
}

# Spot illustration (inline)
{
  type: "spot",
  src: "path/to/image.png",
  caption: "Optional caption",
  alt: "Alternative text",
  width: "auto" | number,  # pt or %
  float: "none" | "left" | "right"
}
```

## Layout Engine Implications

### Full-Bleed
- **PDF output**: Place at exact page dimensions; add bleed to file
- **HTML output**: `width: 100vw` or container width with `margin: 0`
- **Page break behavior**: Triggers page break before and after
- **Trim consideration**: Must extend beyond trim line by 0.125"

### Vignette
- **PDF output**: Calculate half-page dimensions; position as specified
- **Text relationship**: Text flows in remaining half of page
- **Alignment**: Need explicit positioning (top/bottom, left/right)
- **Gutter consideration**: On facing pages, position relative to gutter

### Spot
- **Flow behavior**: Part of normal text flow (inline block)
- **Sizing**: Maintain aspect ratio; scale to text column width
- **Float options**: Support float left/right for text wrap
- **Break behavior**: Can break across pages with surrounding text
- **Width defaults**: Auto-size to fit within column

## PDF Implementation Notes

- Use `takumi-pdf`'s image placement primitives
- Calculate actual dimensions from image metadata
- Apply bleed by extending full-bleed images beyond page box
- Use page break hooks for full-bleed and vignette boundaries
- Spot images use standard text flow mechanisms

## HTML Implementation Notes

- Full-bleed: `width: 100%` on container, negative margins if needed
- Vignette: CSS grid or flexbox for half-page layout
- Spot: Standard `<img>` with `float` and `width` properties
- Responsive: Media queries for mobile vs. print vs. screen