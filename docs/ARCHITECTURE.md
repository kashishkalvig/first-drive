# Architecture

A canvas draws the art; DOM sits over it for anything that must be text. Both
live inside one transformed stage, so they cannot drift apart.

```
FirstDriveExperience          state machine owner, all live copy and controls
└── ExperienceStage           sizes the stage, publishes --stage-scale
    ├── <canvas>              every sprite, plate, particle
    └── .overlay              headings, CTAs, chips, replay — real DOM
```

## Why hybrid

Text baked into a canvas cannot be selected, scaled by the user's font settings,
read by a screen reader or focused. Sprites in the DOM mean one element per
frame and a layout pass per tick. So: art on the canvas, language in the DOM,
one shared coordinate system.

## Module map

| module | responsibility |
| --- | --- |
| `config/assets.ts` | the only place a filename appears; `assetUrl()` resolver |
| `config/manifest.ts` | typed, validated, memoised load of `asset-manifest.json` |
| `config/experience.ts` | design constants, every placement rect, timings |
| `config/copy.ts` | every word on screen |
| `rendering/drawSpriteFrame.ts` | source-rect maths, `fitToCell`, masked draw |
| `rendering/viewport.ts` | stage scale and render scale |
| `rendering/CanvasRenderer.ts` | backing store, DPR, design-space transform |
| `animation/SceneDirector.ts` | state machine, timelines, the RAF loop |
| `animation/sceneGraph.ts` | legal transitions, kept separate so they're testable |
| `animation/SpriteAnimator.ts` | frame advance from elapsed time |
| `animation/ParallaxController.ts` | layer offsets, mirrored tiling |
| `animation/ParticleSystem.ts` | fixed pool of 28 |
| `animation/timings.ts` | one `Timing` shape for both motion preferences |
| `scenes/*.ts` | pure draw functions; no state, no timing |
| `scenes/sceneTypes.ts` | the flat `SceneState` everything tweens |

Scenes **draw only**. They read `world.state` and paint. All timing lives in the
director. That split is why adding a scene is mostly mechanical.

## The state machine

```
PRELOAD → OPENING → REVEAL → KEY → DRIVING → ARRIVAL → COMPLETE
                                                          ↓ replay
                                                       OPENING
```

`SceneDirector.transition()` is the only way the scene changes. It refuses any
move not in `ALLOWED_TRANSITIONS` and any move while `transitioning` is set.
That single choke point is what makes double taps harmless.

### Non-blocking entrances — subtle, and load-bearing

`NON_BLOCKING_SCENES = {OPENING, KEY, COMPLETE}`.

The opening fade and the key's rise are entrances onto a control that is
*already visible and enabled*. Holding the transition lock through them silently
swallowed an eager first tap — a real bug the smoke test caught, on both
controls.

The interactions still take the lock: `playKeyActivation()` claims it before the
unlock runs, so three rapid key taps still produce exactly one drive. Both
halves are asserted in `tests/smoke.mjs`.

## How animation is driven

GSAP tweens **one flat object** (`SceneState`), and the renderer reads it. No
per-frame React state, no component re-render while anything moves.

That flatness is also why replay is trivial: `Object.assign(state,
createSceneState())` rewinds every animated value at once, with no per-scene
audit. `replayAndMotion.test.ts` asserts the shape stays complete.

Sprite frames advance on **accumulated milliseconds**, not render-frame counts,
so an 8 fps cloth reveal takes the same 1.0 s at 60 Hz and 120 Hz. Deltas are
clamped at `SpriteAnimator.MAX_DELTA_MS = 120`, so a tab hidden for a minute
resumes where it paused instead of fast-forwarding. `visibilitychange` pauses
the loop and the active timeline outright.

## Rendering pipeline, per frame

```
clear
  → scene draw (backgrounds, sprites)
  → particles
  → vignette overlay
  → white flash (key transition)
```

Draw order inside a scene follows `sceneLayerOrder` in the manifest, except
where noted in [ASSET-NOTES.md](ASSET-NOTES.md).

## Responsive strategy

See [COORDINATE-SPACES.md](COORDINATE-SPACES.md) for the full picture. In short:

- Design space is 941 × 1672; one transform scales it to the device.
- `scale = min(vh/1672, vw/752)` — height-first, so plates reach both edges on a
  phone and the stage centres in a dark surround on desktop.
- The canvas lives *inside* that transform, so its CSS size is the design size
  and only its backing store accounts for the device:
  `renderScale = min(devicePixelRatio × scale, 2)`.

**The trap:** sizing the canvas to the viewport scales it twice and leaves the
art in a corner. The first implementation did exactly that.

## Reduced motion

Not a separate path. `timingFor(reduced)` returns the same beats with smaller
numbers; the key's arc collapses to a short move, the particle burst becomes a
fade, parallax stops at the arrival. Tap to finale: ~19 s → ~7 s, same final
composition. `tests/reduced-motion.mjs` asserts the story still completes.
