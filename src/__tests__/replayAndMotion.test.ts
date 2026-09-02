import { describe, expect, it } from 'vitest';
import { createSceneState } from '../scenes/sceneTypes';
import { timingFor, unlockDuration } from '../animation/timings';
import { REDUCED_TIMING, TIMING } from '../config/experience';
import { revealSparkleParticles } from '../scenes/KeyScene';
import { ParticleSystem } from '../animation/ParticleSystem';

describe('replay reset', () => {
  it('starts from a state with nothing revealed and nothing moving', () => {
    const state = createSceneState();
    expect(state.carAlpha).toBe(0);
    expect(state.coverAlpha).toBe(1);
    expect(state.pandaAlpha).toBe(0);
    expect(state.duckAlpha).toBe(0);
    expect(state.keyAlpha).toBe(0);
    expect(state.drivingAlpha).toBe(0);
    expect(state.arrivalAlpha).toBe(0);
    expect(state.womanAlpha).toBe(0);
    expect(state.whiteFlash).toBe(0);
    expect(state.wheelSpinning).toBe(false);
    expect(state.maleAlpha).toBe(0);
  });

  it('produces an independent object each time, so a reset cannot share state', () => {
    const first = createSceneState();
    first.carAlpha = 1;
    first.keyRotation = 45;
    const second = createSceneState();
    expect(second.carAlpha).toBe(0);
    expect(second.keyRotation).toBe(0);
    expect(second).not.toBe(first);
  });

  it('covers every animated field, so Object.assign fully rewinds the scene', () => {
    const keys = Object.keys(createSceneState());
    for (const required of [
      'openingAlpha', 'maleAlpha', 'coverAlpha', 'carAlpha',
      'pandaAlpha', 'duckAlpha', 'keyAlpha', 'keyPose',
      'drivingAlpha', 'wheelSpinning', 'arrivalAlpha', 'womanAlpha',
      'whiteFlash', 'vignetteAlpha',
    ]) {
      expect(keys, `missing ${required}`).toContain(required);
    }
  });
});

describe('reveal celebration burst', () => {
  it('spawns a dense, large burst instead of a sparse sparkle', () => {
    const world = {
      manifest: {
        referenceAssembly: {
          reveal: {
            revealGroupRect: [145, 790, 720, 720],
          },
        },
      },
      images: new Map(),
      reduced: false,
      state: createSceneState(),
      anim: {} as any,
      particles: new ParticleSystem({ cells: [], size: [512, 512] } as any, 200),
      parallax: {} as any,
      scratch: null,
    } as any;

    revealSparkleParticles(world);

    expect(world.particles.activeCount).toBeGreaterThan(18);
    expect(world.particles.activeCount).toBeLessThanOrEqual(200);
  });
});

describe('reduced motion', () => {
  it('derives its numbers from the two timing tables', () => {
    expect(timingFor(false).openingFadeIn).toBe(TIMING.openingFadeIn);
    expect(timingFor(true).openingFadeIn).toBe(REDUCED_TIMING.openingFadeIn);
  });

  it('keeps every beat, just shorter', () => {
    const full = timingFor(false);
    const reduced = timingFor(true);
    const keys = Object.keys(full) as Array<keyof typeof full>;
    expect(keys.length).toBeGreaterThan(5);
    for (const key of keys) {
      const name = String(key);
      expect(reduced[key], `${name} present`).toBeTypeOf('number');
      expect(reduced[key], `${name} shorter`).toBeLessThanOrEqual(full[key]);
      // A beat that dropped to zero would be a beat removed, not shortened.
      expect(reduced[key], `${name} not removed`).toBeGreaterThan(0);
    }
  });

  it('shortens the whole unlock sequence', () => {
    expect(unlockDuration(timingFor(true))).toBeLessThan(unlockDuration(timingFor(false)));
    expect(unlockDuration(timingFor(true))).toBeGreaterThan(0);
  });
});
