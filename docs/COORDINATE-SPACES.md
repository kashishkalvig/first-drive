# Coordinate spaces

Four different spaces are in play, and mixing them up is the single easiest way
to break this project. Every one of the layout bugs found during the build was a
space confusion.

## 1. Design space — 941 × 1672

The space everything is authored in. It is the exact pixel size of the supplied
reference screens, so a position read off a reference transfers here one to one.

Every rect in `src/config/experience.ts` is in design space. Every DOM overlay
position is in design space. The canvas context is transformed so `ctx.drawImage`
at `(470, 800)` means design `(470, 800)` on any device.

One transform maps design space to the device:

```
scale = min(viewportHeight / 1672, viewportWidth / 752)
```

**Safe band: x ∈ [95, 846].** On the narrowest supported phone (360×800) only
1672 × 0.45 = 752 design px of width are visible, centred. Anything outside that
band is cropped on a real phone. Text, faces, hands and mascots must stay inside
it. The reference screens do *not* respect this — several put characters at
x < 40 — which is why some placements deliberately differ from them.

## 2. Cell space — per sheet

Each sprite sheet has its own cell size, and they are **not** interchangeable:

| sheet | grid | cell |
| --- | --- | --- |
| `maleIdle`, `womanDriver`, `silverLiftback`, `contactShadows` | 2×3 | 512 × 512 |
| `pandaRevealCheer`, `duckRevealCheer`, `womanWalk` | 2×4 | 512 × **384** |
| `redCoverReveal` | 2×4 | 512 × 512 |
| `keyFx` | 3×4 | **384 × 384** |

`spriteSourceRect()` always reads the grid from the sheet definition. Never
assume 512.

### The character does not fill its cell

This is the trap. Run `python3 tools/measure.py frames pandaRevealCheer`:

```
7   landing-wave    x  86..358 y   4..338   273x335   0.53 / 0.87
```

The panda occupies **53% of its cell's width**. A placement rect sized to the
character you want renders it at roughly half that size. To get a character `N`
px tall:

```
cellDrawWidth = N / (bboxHeight / cellHeight) × (cellWidth / cellHeight)
```

For a 340 px panda: `340 / 0.872 × 1.333 ≈ 520`. That is why
`LAYOUT.stationFinale.panda` is 520 wide for a mascot that reads as ~280 px.

### Non-square cells must not be stretched

`fitToCell()` in `src/rendering/drawSpriteFrame.ts` derives the drawn height from
the cell's own aspect ratio and honours the sheet's anchor. Use it for any sheet
whose cell is not square — currently the panda, duck and walk sheets. Drawing a
512×384 cell into a square rect stretches the character vertically by a third.

## 3. Assembly space — 512 × 512, the car only

The driving car is not one sprite. It is a body, two wheels and a driver
composited inside a notional 512 × 512 box, which is then mapped into design
space by `LAYOUT.driving.carAssembly`.

`side_window_driver_clip.png` is a 512 × 512 mask in this space, which is what
fixes the size: the mask defines the space, so wheel and driver rects must be
expressed in it too.

```
scale = carAssembly.width / 512
designX = carAssembly.x + assemblyX × scale
```

`LAYOUT.driving.frontWheel`, `rearWheel` and `driverFrame` are all in assembly
space.

## 4. Anchor semantics

Every sprite has a normalised anchor in the manifest:

- Characters and chests: `[0.5, 1.0]` — bottom centre, their ground contact.
- Key and effects: `[0.5, 0.5]` — centre.
- Cover and car: `[0.5, 0.8]`.

**A rect's `y + height` is the anchor line, not the top edge**, for anything
anchored at `[0.5, 1.0]` through `fitToCell`. Setting a mascot's rect to
`[110, 1390, 280, 280]` puts its *feet* at y = 1670 — below the frame. This
caused a real bug; the mascots rendered almost entirely off-screen.

For a character whose feet should land on design y = 1600 with a cell drawn
520 wide, and whose bbox bottom is at 0.872 of the cell height:

```
cellBottom = 1600 + (1 - 0.872) × (520 × 384/512) = 1650
rect.y     = cellBottom - rect.height
```
