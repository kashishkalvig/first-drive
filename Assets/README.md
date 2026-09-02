# First Drive Interactive — Clean Alpha Pack 2.1

This is the corrected portrait production pack. All files in `sprites/` and
`overlays/` are true-alpha PNGs. No green screen, checkerboard, white matte, or
other preview background is baked into those files.

The sprite edges were de-spilled and rechecked against black, white, and dark
navy. RGB data in pixels whose alpha is zero has also been cleared, preventing
green fringes when the sheets are scaled, filtered, or animated on the web.

## Folder rules

- `sprites/` — transparent sprite sheets only.
- `overlays/` — transparent vignette and side-window mask.
- `backgrounds/` — separate portrait scene plates and parallax layers. The gate,
  far-driving, and station plates are intentionally opaque because they are
  environments, not sprites. The driving midground and road layers use alpha.
- `asset-manifest.json` — grids, frame names, sizes, anchors, and scene placement.
- `alpha-validation.json` — decoded-alpha and hidden-RGB validation results.

If only transparent files are required, use the separate
`car_first_drive_transparent_sheets_only.zip` archive. It contains no scene
backgrounds or QA previews.

Checkerboard and dark-background review proofs are distributed separately from
both production archives, so they cannot be mistaken for usable assets.

## Runtime cropping

Frames are row-major and use the exact `grid`, `cell`, and `size` values in the
manifest.

```js
const column = frameIndex % columns;
const row = Math.floor(frameIndex / columns);
const sx = column * cellWidth;
const sy = row * cellHeight;

ctx.drawImage(
  image,
  sx,
  sy,
  cellWidth,
  cellHeight,
  dx,
  dy,
  drawWidth,
  drawHeight
);
```

Do not use CSS chroma-keying, `mix-blend-mode`, or a runtime green-removal
filter. Transparency is already encoded in each PNG alpha channel.

## Red cover alignment

The reveal car frame and all red-cover frames share 512 × 512 source cells.
Draw the car first, then draw the selected cover frame into the exact same
destination rectangle. Do not independently resize or reposition the cover.

## UI text

Keep all headlines, prompts, buttons, hit areas, and accessibility labels as
live HTML/CSS. None of the production art contains baked UI text.
