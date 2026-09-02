# First Drive

A short portrait web animation for one small milestone: her first drive to
Craigieburn Railway Station before work.

```
npm install
npm run dev            # http://localhost:5173
npm run build          # -> dist/
npm run preview

npm run typecheck
npm test               # 54 unit tests
npm run smoke          # end-to-end walk-through, 7 viewports
npm run smoke:reduced  # the same story under prefers-reduced-motion
```

Vite + React + TypeScript + GSAP. A single canvas draws the art; the copy and
controls are live DOM over it. No game engine, no WebGL.

---

## The sequence

```
PRELOAD → OPENING → REVEAL → KEY → DRIVING → ARRIVAL → COMPLETE
```

Dawn outside the house, a shape under a red cloth. Tap, and the panda and duck
haul the cover off the car. A golden key rises; tap it, and the light carries
into a side-on drive through Melbourne suburbia. The car slows, and she walks
into Craigieburn Station.

Every transition goes through `SceneDirector.transition()`, which refuses any
move that is not legal from the current scene and any move at all while another
transition is running. That one choke point is what makes a double tap
harmless — the second tap finds the machine already past `OPENING` and is
dropped, rather than starting a second cloth animation over the first.

Two entrances deliberately do **not** hold that lock: the opening fade and the
key's rise. Both are just entrances onto a control that is already on screen and
enabled, and holding the lock through them silently swallowed an eager first
tap. The interactions still take it — `playKeyActivation` claims the lock before
the unlock runs — so three rapid taps on the key still produce exactly one
drive. The smoke test asserts both halves of that.

---

## The art

Nothing was redrawn. The supplied pack is used as delivered:

| | |
| --- | --- |
| `backgrounds/` | five portrait plates — gate, three driving layers, station |
| `sprites/` | nine sheets — male, panda, duck, cover, car, key FX, driver, walk, shadows |
| `overlays/` | vignette and the side-window mask |

All of it resolves through one root and one registry
([`src/config/assets.ts`](src/config/assets.ts)); no filename appears anywhere
else, and nothing in the source is a local filesystem path. The root comes from
`VITE_ASSET_BASE_URL`, falling back to `${BASE_URL}assets/first-drive`.

Sprites are cropped at draw time from the whole sheets using the grid, cell and
anchor values in `asset-manifest.json` — never a guessed grid, and never one
image element per frame. Every sheet's dimensions and alpha flags were checked
against the manifest before a line was written; all sixteen matched.

The alpha is genuine, as `alpha-validation.json` claims. There is no chroma
key, no `mix-blend-mode` background removal, no checkerboard proof anywhere in
the build.

### The cover and the car share one rectangle

The reveal car and all eight cover frames are drawn into the *same* destination
rect, read once per frame. The cover is never independently centred, scaled,
rotated or nudged, and the car never moves while the cloth animates over it.

The car is not drawn at all during `OPENING`. Measured: the cover's silhouette
encloses the car's, but 0.36% of the car's pixels sit under cloth that is only
*near*-opaque, so compositing the car underneath leaks a thin silver fringe
before the reveal. Omitting it makes "no vehicle pixels before the reveal"
absolute rather than nearly true, and looks identical.

---

## Four things the manifest gets wrong

The manifest is the technical authority and was followed everywhere it holds up.
Six values did not survive contact with the art, and each is corrected in
[`src/config/experience.ts`](src/config/experience.ts) with the measurement that
justifies it.

**Wheels.** `[81,301,86,86]` / `[390,301,86,86]` put the wheels outside the
arches. 86 is the *visible* tyre diameter, but the wheel frames carry
transparent padding — the art occupies 249 of its 512-pixel cell — so a
destination of 86 renders a 42px tyre in the wrong place. Measured from the
sheet: in the complete side view the tyres span x 71–132 and x 372–432 and touch
the road at y=396, giving 62px wheels centred at (102,365) and (402,366); the
arch apex in the body-only frame sits at y=371, which agrees. Scaled back
through the sprite's own padding: `[38,301,128,128]` and `[338,302,128,128]`.

**Driving car height.** `y=805` drops the car onto the bottom edge, below the
road and under the caption. The approved driving reference sits it on the road
with its roof near y=835 → `y=515`.

**Mascot placement.** `x=5` and `x=695` reach past both edges of the band that
survives on a 360-wide phone, cropping a paw and a wing. Both are pulled inside
the safe band at the width the reference shows, feet on the same ground line.

**The finale had no mascots.** The manifest's `stationFinale` layer order lists
only the station, car and walking figure, but the approved arrival screen has
the panda and duck large in the foreground corners. They are added from the
reference, and sized from the *characters* rather than the cells: each mascot
fills only about half its 512×384 cell (panda 273×335, duck 250×329), so a rect
sized to the character renders it at half scale.

**The driver framed pure hair.** `driverFrameRect: [141,211,180,180]` made the
side window sample her cell-y 102–267, and her navy uniform does not start until
cell-y 281 — so the glass showed one dark mass and read as empty.
`[152,177,198,198]` maps the window onto cell-y 181–331 instead: hair and the
back of her head in the upper two thirds, navy shoulder and her hand on the
wheel in the lower third.

**Square rects for non-square cells.** Several placement rects are square while
the panda, duck and walk sheets use 512×384 cells — drawing straight into them
stretched all three vertically by a third. `fitToCell` now derives the height
from the cell's own aspect and honours the rect's anchor.

### Parallax seams

The three driving plates are marked `repeatX: true` but were not authored to
loop: their left and right edges differ by up to 255. Butting copies together
left a hard vertical seam mid-frame. Every second tile is now drawn mirrored, so
each join is an edge against a copy of itself — continuous by construction, and
on foliage, rooflines and a road it reads as more scenery rather than a repeat.
Tile indices are absolute so a tile keeps its parity as it recycles.

---

## Where the references and the brief disagree

Two of the four reference screens read **"Her first drive to work"**. The
content rules forbid exactly that: she drives to Craigieburn Station and
continues from there. The most final reference — the arrival screen — already
uses the correct framing, *"Your first drive to Craigieburn Station — a little
milestone, now officially yours"*, so the station wording carries across all
scenes while the references' voice, rhythm and gold-flourish typography are
kept. The smoke test asserts no scene claims otherwise.

The driving reference shows her face in profile. The production sprite does not:
`woman_driver_2x3_portrait.png` is back-facing in all six frames, with the white
wavy scrunchie on her left wrist. The sprite is what ships, so her face is never
shown — which is also what the brief requires.

The manifest's key rect (centre y=815) sits lower than the approved key screen
(centre y≈580). The manifest calls its own figures "recommended placements"
while the references are the stated composition authority, so the reference wins
on Y; X, width and height are the manifest's.

---

## The stage

Everything is authored in a fixed **941×1672** design space — the exact size of
the supplied references, so positions read off them transfer one to one. One
transform scales it:

```
scale = min(viewportHeight / 1672, viewportWidth / 752)
```

Height first, which is what a portrait phone wants: the stage ends up wider than
the screen, so the plates reach both edges. On desktop it is narrower and
centres in a dark surround. The second term stops an unusually narrow window
zooming past the safe band.

The canvas sits *inside* that transformed stage, so its CSS size is the design
size and only its backing store accounts for the device:
`renderScale = min(devicePixelRatio × scale, 2)`. Sizing it to the viewport
instead — the first version did — scales it twice and leaves the art in a corner.

## Motion

GSAP timelines orchestrate the scenes by tweening one flat state object that the
renderer reads; nothing animates through React state, and the canvas never
re-renders a component. Sprite frames advance on accumulated milliseconds, not
on render-frame count, so an 8 fps cloth reveal takes the same 1.0 s at 60 Hz
and at 120 Hz. Deltas are clamped at 120 ms, so a tab that was hidden for a
minute resumes where it paused instead of fast-forwarding; `visibilitychange`
pauses the loop and the active timeline outright.

Particles come from a fixed pool of 28, allocated once — a replay cannot leak
them and a burst cannot allocate mid-frame.

Reduced motion is not a separate path. `timingFor()` returns the same beats with
smaller numbers, the key's arc collapses to a short move, the burst becomes a
fade, and parallax stops at the arrival. Tap to finale goes from ~19 s to ~7 s
with the same final composition.

## Accessibility

Semantic buttons with visible focus rings and `aria-label`s; the key has both an
invisible hit area over the canvas art and a labelled pill, so it works by
touch, mouse and keyboard. Decorative sprites are canvas-drawn and invisible to
assistive technology; the scene copy above them is real text. No text is baked
into any image.

## Current status

Committed mid-iteration, and two things are red:

- **`npm run build` fails.** `tsc -b` reports `RevealScene.ts(4,10): 'drawMale'
  is declared but its value is never read` — the man was removed from both
  scenes but the import stayed. One line. `npm run dev` is unaffected.
- **`npm run smoke` fails.** It still asserts the driving destination chip and
  caption, both of which were removed from the DOM; it times out looking for
  `.destination-chip`.

Also worth knowing: `SceneDirector.decelerate()` is no longer called. `handleKey`
holds the drive for a fixed 2 s and cuts straight to the arrival, so the car
never slows and its wheels never stop — `decelerate()` was the only thing setting
`wheelSpinning = false`. `TIMING.driving.cruise` and `.decelerate` are dead on
the normal path.

`npm test` (54) and `npm run smoke:reduced` both pass.

## Verified

Unit: 54 tests over the asset resolver, sprite-frame arithmetic, the transition
guards, the animator's timing and clamping, parallax wrapping and mirrored
tiling, the shipped manifest, the viewport strategy, replay reset and
reduced-motion timing.

End-to-end, in Chromium at 360×800, 375×812, 390×844, 393×852, 412×915, 430×932
and 1440×900: preload completes, the canvas is actually painting, the page never
scrolls, the CTA advances and a second tap is ignored, the reveal runs
automatically to the key, three rapid key taps produce one drive, the road
scrolls, the finale copy is correct, no scene claims she drove straight to work,
and replay returns to the opening with the key locked again. No console errors
or failed requests.

That run was green before the copy changes above; the suite needs its driving
assertions updated to match.

## Deploying

`.env.example` documents the three public runtime values. They are configuration,
not secrets.
