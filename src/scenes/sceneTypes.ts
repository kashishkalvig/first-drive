import type { AssetManifest, Rect, SheetDefinition } from '../config/manifest';
import type { SpriteAnimator } from '../animation/SpriteAnimator';
import type { ParticleSystem } from '../animation/ParticleSystem';
import type { ParallaxController } from '../animation/ParallaxController';

export type SceneName =
  | 'PRELOAD'
  | 'OPENING'
  | 'REVEAL'
  | 'KEY'
  | 'DRIVING'
  | 'PARKED'
  | 'ARRIVAL'
  | 'COMPLETE';

/**
 * Plain tweenable numbers describing the current frame of the world.
 *
 * GSAP animates this object directly; the renderer only ever reads it. Keeping
 * every animated value in one flat place is what makes a full replay reset a
 * single assignment rather than an audit of every scene.
 */
export type SceneState = {
  openingAlpha: number;
  maleAlpha: number;
  coverAlpha: number;
  carAlpha: number;

  /** Whole-body nudge for the mascots while they haul on the cloth. */
  pandaOffsetX: number;
  pandaOffsetY: number;
  pandaAlpha: number;
  duckOffsetX: number;
  duckOffsetY: number;
  duckAlpha: number;

  keyAlpha: number;
  /** Index into the key sheet's four poses: neutral, glow, pressed, rotate. */
  keyPose: number;
  keyScale: number;
  keyFloat: number;
  keyRotation: number;
  keyBurstAlpha: number;
  keyBurstScale: number;
  keyRingAlpha: number;
  keyRingScale: number;

  drivingAlpha: number;
  parkedAlpha: number;
  carBob: number;
  wheelSpinning: boolean;
  destinationAlpha: number;

  arrivalAlpha: number;
  /** Panda and duck in the finale corners. */
  mascotFinaleAlpha: number;
  stationCarX: number;
  womanAlpha: number;
  womanX: number;
  womanY: number;

  whiteFlash: number;
  vignetteAlpha: number;
};

export function createSceneState(): SceneState {
  return {
    openingAlpha: 0,
    maleAlpha: 0,
    coverAlpha: 1,
    carAlpha: 0,

    pandaOffsetX: 0,
    pandaOffsetY: 0,
    pandaAlpha: 0,
    duckOffsetX: 0,
    duckOffsetY: 0,
    duckAlpha: 0,

    keyAlpha: 0,
    keyPose: 1,
    keyScale: 0.6,
    keyFloat: 0,
    keyRotation: 0,
    keyBurstAlpha: 0,
    keyBurstScale: 0.4,
    keyRingAlpha: 0,
    keyRingScale: 0.5,

    drivingAlpha: 0,
    parkedAlpha: 0,
    carBob: 0,
    wheelSpinning: false,
    destinationAlpha: 0,

    arrivalAlpha: 0,
    mascotFinaleAlpha: 0,
    stationCarX: 0,
    womanAlpha: 0,
    womanX: 0,
    womanY: 0,

    whiteFlash: 0,
    vignetteAlpha: 1,
  };
}

export type Animators = {
  male: SpriteAnimator;
  panda: SpriteAnimator;
  duck: SpriteAnimator;
  cover: SpriteAnimator;
  driver: SpriteAnimator;
  walk: SpriteAnimator;
};

export type World = {
  manifest: AssetManifest;
  images: Map<string, HTMLImageElement>;
  reduced: boolean;
  state: SceneState;
  anim: Animators;
  particles: ParticleSystem;
  parallax: ParallaxController;
  /** Scratch canvas for masked compositing; allocated once, reused every frame. */
  scratch: HTMLCanvasElement;
};

/** Convenience: fetch a sheet definition, failing loudly if the manifest lacks it. */
export function sheet(world: World, name: string): SheetDefinition {
  const definition = world.manifest.spriteSheets[name];
  if (!definition) throw new Error(`Manifest has no sprite sheet "${name}"`);
  return definition;
}

/** Scene rect from the manifest, falling back to a supplied default. */
export function layoutRect(
  world: World,
  scene: string,
  key: string,
  fallback: Rect,
): Rect {
  return world.manifest.referenceAssembly?.[scene]?.[key] ?? fallback;
}
