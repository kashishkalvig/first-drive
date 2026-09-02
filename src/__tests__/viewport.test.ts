import { describe, expect, it } from 'vitest';
import { computeStageMetrics, isAwkwardLandscape } from '../rendering/viewport';
import { DESIGN, MAX_DPR, MIN_VISIBLE_WIDTH } from '../config/experience';

const PHONES: Array<[number, number]> = [
  [360, 800],
  [375, 812],
  [390, 844],
  [393, 852],
  [412, 915],
  [430, 932],
];

describe('stage metrics', () => {
  it('fills the height of every supported phone without letterboxing', () => {
    for (const [width, height] of PHONES) {
      const m = computeStageMetrics(width, height, 3);
      expect(m.cssHeight, `${width}x${height}`).toBeCloseTo(height, 0);
      // Wider than the screen, so the plates reach both edges.
      expect(m.cssWidth).toBeGreaterThanOrEqual(width);
    }
  });

  it('keeps the safe band visible on every supported phone', () => {
    for (const [width, height] of PHONES) {
      const m = computeStageMetrics(width, height, 2);
      const visibleDesignWidth = width / m.scale;
      expect(visibleDesignWidth, `${width}x${height}`).toBeGreaterThanOrEqual(
        MIN_VISIBLE_WIDTH - 1,
      );
    }
  });

  it('centres inside a dark surround on a desktop window', () => {
    const m = computeStageMetrics(1440, 900);
    expect(m.cssWidth).toBeLessThan(1440);
    expect(m.offsetX).toBeGreaterThan(0);
    expect(m.cssHeight).toBeCloseTo(900, 0);
  });

  it('never stretches: the aspect ratio is always the design ratio', () => {
    const designRatio = DESIGN.width / DESIGN.height;
    for (const [width, height] of [...PHONES, [1440, 900], [320, 1000] as [number, number]]) {
      const m = computeStageMetrics(width, height);
      expect(m.cssWidth / m.cssHeight).toBeCloseTo(designRatio, 6);
    }
  });

  it('caps the device pixel ratio', () => {
    expect(computeStageMetrics(390, 844, 4).dpr).toBe(MAX_DPR);
    expect(computeStageMetrics(390, 844, 1).dpr).toBe(1);
  });

  it('flags only genuinely awkward landscape', () => {
    expect(isAwkwardLandscape(844, 390)).toBe(true);
    expect(isAwkwardLandscape(390, 844)).toBe(false);
    expect(isAwkwardLandscape(1440, 900)).toBe(false);
  });
});
