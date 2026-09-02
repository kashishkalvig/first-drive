# Asset notes

What the supplied pack contains, where its manifest is wrong, and what any
replacement asset has to satisfy.

**Re-derive, don't trust.** Every number below came from
`python3 tools/measure.py`, and every one can be re-checked with it. If you find
yourself about to "correct" a value in `src/config/experience.ts` back to the
manifest's, run the tool first — the manifest is wrong in six places and each
correction has a measurement behind it.

```
python3 tools/measure.py sheets    # every file vs its manifest entry
python3 tools/measure.py frames <sheetName>
python3 tools/measure.py wheels
python3 tools/measure.py window
python3 tools/measure.py conceal
python3 tools/measure.py seams
python3 tools/measure.py all
```

---

## What is in the pack

`Assets/` holds the pack exactly as supplied, including four reference screens.
`public/assets/first-drive/` is the runtime copy that ships — the same files
minus the references. The tooling reads `Assets/`; the app reads `public/`.

Nine sprite sheets, five background plates, two overlays, plus
`asset-manifest.json` and `alpha-validation.json`.

**Alpha is genuine.** `alpha-validation.json` claims true alpha with zeroed
hidden RGB, and that holds up: `measure.py sheets` confirms every sprite and
overlay carries an alpha channel and every background matches its declared
opacity. There is no chroma key, no `mix-blend-mode` background removal and no
checkerboard proof anywhere in the build, and none is needed.

---

## Where the manifest is wrong

Six values do not survive contact with the art. All corrections live in
`src/config/experience.ts` next to the reasoning.

### 1 & 2. Wheel rects

Manifest: `frontWheelRect [81,301,86,86]`, `rearWheelRect [390,301,86,86]`.
These place the wheels outside the arches.

`86` is the *visible* tyre diameter, but the wheel frames carry transparent
padding — `measure.py wheels` reports the art occupying **249 of its 512-px
cell (0.486)**. A destination of 86 therefore renders a ~42 px tyre, in the
wrong place.

Measured: tyres span x 70–133 and 371–432, touch the road at y = 396, giving
~62 px wheels centred at **(102, 364)** and **(402, 365)**. The body's arch apex
sits at y = 371 and its sill at y = 389, both consistent. Scaling 62 back up
through the sprite's own padding gives a ~130-unit destination box.

In use: `[38, 301, 128, 128]` and `[338, 302, 128, 128]`. The tool reports
`[36,298,132,132]` / `[338,301,127,127]`; the 2–4 px difference is threshold
sensitivity in tyre-column detection, and the shipped values were confirmed
visually. Anything in that range is fine.

### 3. Driver frame — the one that mattered most

Manifest: `driverFrameRect [141,211,180,180]`. This made the side window show a
featureless dark mass, and the drive read as an empty car.

`measure.py window` explains it exactly:

```
window mask opaque region: x 217..289  y 247..305  (73x59)
navy uniform starts at cell-y 281

  manifest  [141, 211, 180, 180]  -> cell-y 102..267
  ours      [152, 177, 198, 198]  -> cell-y 181..331
```

The window was sampling cell-y 102–267 — entirely hair, because her uniform does
not begin until cell-y 281. `[152, 177, 198, 198]` maps the window onto cell-y
181–331 instead: hair and the back of her head in the upper two thirds, navy
shoulder and her hand on the wheel in the lower third.

**The rule:** the uniform's start (cell-y 281) must fall inside the sampled
range, or the glass shows only hair.

### 4. Driving car height

Manifest: `carAssemblyRect [60,805,820,820]` drops the car onto the bottom edge,
below the road surface and under the caption card. The approved driving
reference sits it on the road with its roof near y = 835 → `[60, 515, 820, 820]`.

### 5. Mascot placement in the reveal

Manifest: `pandaRect [5,1050,...]`, `duckRect [695,1085,...]`. Both reach past
the safe band (x ∈ [95, 846]) and crop a paw and a wing on a 360-wide phone.
Pulled inside the band at the width the reference shows, feet on the same line.

### 6. The finale has no mascots at all

`sceneLayerOrder.stationFinale` lists only the station, car and walking figure.
The approved arrival screen clearly has the panda and duck large in the
foreground corners. They are added from the reference, in
`LAYOUT.stationFinale.panda` / `.duck`, sized from the measured character bounds
rather than the cell (see [COORDINATE-SPACES.md](COORDINATE-SPACES.md)).

### Also: the key rect

Not wrong so much as outvoted. The manifest puts the key at centre y = 815; the
approved key screen shows it near y = 580. The manifest calls its own figures
"recommended placements" while the references are the stated composition
authority, so the reference wins on Y. X, width and height are the manifest's.
See `keyRect()` in `src/scenes/KeyScene.ts`.

---

## Parallax plates do not tile

All three driving layers are flagged `repeatX: true` but were painted as scenes,
not tiles. `measure.py seams`:

```
drivingFar             mean 14.0  max  79   NO
drivingMidground       mean  4.5  max 242   NO
drivingForegroundRoad  mean 14.6  max 255   NO
```

Butting copies together leaves a hard vertical seam mid-frame. Every second tile
is drawn mirrored (`isMirroredTile` in `ParallaxController`), so each join is an
edge against a copy of itself — continuous by construction. Tile indices are
absolute so a tile keeps its parity as it recycles.

The visible cost is a faint symmetry in the treeline. That is the trade-off; a
genuinely tileable plate would remove it.

---

## The cover hides the car — almost

`measure.py conceal`:

```
car frame 0 opaque pixels: 68554
not covered by fully-opaque cloth: 249 (0.36%)
```

The cover's silhouette encloses the car's, but 249 edge pixels sit under cloth
that is only near-opaque. Compositing the car underneath would leak a thin
anti-aliased silver fringe before the reveal, so **the opening scene does not
draw the car at all**. It looks identical and makes "no vehicle pixels before
the reveal" absolute rather than nearly true.

From `REVEAL` onwards the car and every cover frame share one destination rect,
read once per frame. The cover is never independently centred, scaled, rotated
or nudged, and the car never moves while the cloth animates over it.

---

## Asset contract

If any of these are replaced, the new file must satisfy:

**Any sprite sheet**
- Exact grid and cell size declared in `asset-manifest.json`, frames row-major.
- True alpha, hidden RGB zeroed. `measure.py sheets` must report `ok`.
- Each frame must sit inside its own cell. Crops here come straight from the
  manifest grid, so cells tile exactly and neighbours cannot bleed by
  construction — but a sheet whose art overruns its cell will show the
  neighbour. `measure.py frames <sheet>` prints every frame's bounds; none may
  touch a cell edge that the artwork was not meant to reach.

**`woman_driver_2x3_portrait.png`** *(the one asset that would most improve the result)*
- 2×3 grid, 512×512 cells, six subtle seated frames.
- Deep navy scrubs; large white wavy scrunchie on her **left** wrist, clearly
  readable — not a watch, bracelet or plain ring.
- **Her face must not be readable.** Currently the sheet is fully back-facing,
  which is why the window shows the back of her head rather than the profile the
  driving reference depicts. A rear-three-quarter pose — cheekbone edge and
  jawline visible, face still not readable — would match the reference far more
  closely while keeping that requirement.
- Composed so her head sits in the upper two thirds and her shoulder in the
  lower third of whatever region the window samples; re-check with
  `measure.py window` after any change.

**Driving plates** — if you want the treeline symmetry gone, supply plates whose
left and right edges match (`measure.py seams` reporting `yes`), then drop the
mirroring in `drawLayer`.

**Backgrounds** — 941 × 1672. Gate, far-driving and station stay opaque;
midground and road keep their alpha.

---

## Known asset-level limitations

| | |
| --- | --- |
| Driver reads as the back of a head | The sheet has no profile frame. See the contract above. |
| Faint mirror symmetry in the driving treeline | Plates are not tileable; mirroring is the lesser evil. |
| Duck's bow changes colour mid-sheet | Blue in frames 0–3, purple in 4–7. Supplied that way; not corrected, since the brief forbids regenerating production art. |
| `Assets/` duplicates `public/assets/first-drive/` | ~13 MB each. Intentional for now — `Assets/` keeps the reference screens the runtime copy omits — but worth resolving before this becomes a repo. |
