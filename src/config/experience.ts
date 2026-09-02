/**
 * Tunable numbers for the whole experience: the design coordinate system, where
 * each thing sits in it, how fast the world moves, and how long every beat
 * lasts.
 *
 * The rectangles mirror `referenceAssembly` in the manifest. They are restated
 * here as typed constants so scene code reads declaratively and so a fallback
 * exists if the manifest ever fails to load; `SceneDirector` prefers the
 * manifest's values at runtime.
 */
import type { Rect } from './manifest';

/** Canonical design viewport. Every coordinate in the app is in these units. */
export const DESIGN = { width: 941, height: 1672 } as const;

/**
 * Horizontal band guaranteed visible on the narrowest supported phone. The
 * stage is scaled to fill height, so a 360x800 screen (aspect 0.45) shows
 * 1672 * 0.45 = 752 design px of width. Copy stays inside this.
 */
export const SAFE_BAND = { left: 95, right: 846 } as const;

/** Never zoom so far in that less than this much width remains visible. */
export const MIN_VISIBLE_WIDTH = 752;

/** Device pixel ratio is capped here; beyond 2 the cost outweighs the gain. */
export const MAX_DPR = 2;

export const LAYOUT = {
  opening: {
    male: [-45, 775, 520, 520] as Rect,
    revealGroup: [145, 790, 720, 720] as Rect,
  },
  reveal: {
    revealGroup: [145, 790, 720, 720] as Rect,
    /**
     * The manifest puts the mascots at x=5 and x=695, which reaches past both
     * edges of the band that survives on a 360-wide phone (95..846) and would
     * crop a paw and a wing. Both are pulled inside the band and given the
     * width the reference shows; their feet stay on the same ground line.
     */
    panda: [105, 1096, 292, 292] as Rect,
    duck: [566, 1128, 266, 266] as Rect,
  },
  key: {
    revealGroup: [145, 805, 720, 720] as Rect,
    key: [355, 650, 230, 330] as Rect,
    /** See `keyRect` in KeyScene: the reference places the key higher than the
     *  manifest's recommended Y, and the reference is the composition authority. */
    keyCentreY: 596,
  },
  driving: {
    /**
     * The manifest's y=805 drops the car onto the bottom edge, below the road
     * and under the caption card. The approved driving reference sits it on the
     * road with its roof near y=835, which is this rectangle.
     */
    carAssembly: [60, 515, 820, 820] as Rect,

    /**
     * Wheel placement inside the car's 512x512 assembly space.
     *
     * The manifest's [81,301,86,86] / [390,301,86,86] put the wheels outside
     * the arches, because 86 is the *visible* tyre diameter while the wheel
     * frames carry transparent padding: the art occupies 249 of its 512-pixel
     * cell, so a destination of 86 renders a 42px tyre in the wrong place.
     *
     * Measured from the sheet instead: in the complete side view the tyres span
     * x 71..132 and x 372..432 and touch the road at y=396, giving 62px wheels
     * centred at (102,365) and (402,366); the arch apex in the body-only frame
     * sits at y=371, which both agree with. Scaling 62 back up through the
     * sprite's own padding gives a 128-unit destination box.
     */
    frontWheel: [38, 301, 128, 128] as Rect,
    rearWheel: [338, 302, 128, 128] as Rect,

    /**
     * Where the driver sits inside the same 512x512 assembly space.
     *
     * The manifest's [141,211,180,180] frames pure hair: at that size the
     * window (x 217..289, y 247..305) samples her cell-y 102..267, and her
     * navy uniform does not begin until cell-y 281 — so the glass showed one
     * dark mass and read as empty.
     *
     * This rect maps the window onto her cell-y 181..331 instead: lower hair
     * and the back of her head in the upper two thirds, navy shoulder in the
     * lower third, which is what looking through a car window actually shows.
     * She stays back-facing; the sheet has no forward-facing frame.
     */
    driverFrame: [152, 177, 198, 198] as Rect,
  },
  stationFinale: {
    car: [20, 930, 620, 620] as Rect,
    woman: [420, 860, 560, 680] as Rect,
    /**
     * The approved arrival screen has the panda and duck large in the
     * foreground corners, waving her off. The manifest's `stationFinale` layer
     * order omits them entirely, so these are read off the reference and pulled
     * inside the safe band.
     */
    /*
     * Sized from the characters, not the cells. Each mascot fills only about
     * half its 512x384 cell (panda 273x335, duck 250x329), so a rect sized to
     * the character renders it at half the intended scale. A 520-wide cell puts
     * the panda at 277x340 and the duck at 254x334 — the proportions the
     * arrival reference shows — and `y + height` lands the cell's base so their
     * feet sit just above the frame edge.
     */
    panda: [18, 1122, 520, 520] as Rect,
    duck: [486, 1135, 520, 520] as Rect,
  },
} as const;

/** Relative horizontal scroll speeds, straight from the manifest. */
export const PARALLAX_SPEED = {
  far: 0.08,
  mid: 0.35,
  road: 1.0,
} as const;

/** Design px per second the road travels at cruising speed. */
export const ROAD_SPEED = 620;

export const TIMING = {
  openingFadeIn: 0.9,
  openingTextOut: 0.45,

  reveal: {
    mascotsIn: 0.55,
    gripAt: 0.15,
    pullAt: 0.25,
    clothStart: 0.34,
    clothEnd: 1.45,
    carVisibleAt: 1.1,
    releaseAt: 1.35,
    celebrateEnd: 2.1,
    settle: 0.7,
  },

  key: {
    riseIn: 0.85,
    pressed: 0.12,
    rotate: 0.26,
    burst: 0.5,
    whiteOut: 0.55,
  },

  driving: {
    fadeIn: 0.8,
    cruise: 7.2,
    decelerate: 2.4,
  },

  arrival: {
    crossFade: 0.9,
    settle: 0.6,
    walk: 3.4,
    copyIn: 0.8,
  },
} as const;

/** Reduced-motion replacements: same beats, far less travel. */
export const REDUCED_TIMING = {
  openingFadeIn: 0.4,
  openingTextOut: 0.25,
  reveal: { total: 1.0 },
  key: { total: 0.6 },
  driving: { total: 2.4 },
  arrival: { total: 1.2 },
} as const;

export const ENABLE_SOUND = import.meta.env.VITE_ENABLE_SOUND === 'true';
