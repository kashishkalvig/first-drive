import { describe, expect, it } from 'vitest';
import {
  ParallaxController,
  isMirroredTile,
  tileOffsets,
  wrap,
} from '../animation/ParallaxController';
import { PARALLAX_SPEED } from '../config/experience';

describe('wrap', () => {
  it('keeps values inside [0, span)', () => {
    expect(wrap(0, 941)).toBe(0);
    expect(wrap(941, 941)).toBe(0);
    expect(wrap(1200, 941)).toBe(259);
    expect(wrap(-100, 941)).toBe(841);
  });
});

describe('tileOffsets', () => {
  it('always covers the viewport with no gap, at any offset', () => {
    const width = 941;
    for (let offset = 0; offset < width * 3; offset += 37) {
      for (const direction of ['left', 'right'] as const) {
        const tiles = tileOffsets(offset, width, width, direction);
        expect(tiles[0].x).toBeLessThanOrEqual(0);
        expect(tiles[tiles.length - 1].x + width).toBeGreaterThanOrEqual(width);
        // Tiles are contiguous: each starts exactly where the last ended.
        for (let i = 1; i < tiles.length; i++) {
          expect(tiles[i].x - tiles[i - 1].x).toBeCloseTo(width, 6);
          expect(tiles[i].index - tiles[i - 1].index).toBe(1);
        }
      }
    }
  });

  it('scrolls right for a left-facing car', () => {
    // Follow one specific tile: the visible window gains a tile on the left as
    // the world moves right, so comparing list positions would compare
    // different tiles.
    const xOfTileZero = (offset: number) =>
      tileOffsets(offset, 941, 941, 'right').find((tile) => tile.index === 0)!.x;
    expect(xOfTileZero(200)).toBeGreaterThan(xOfTileZero(0));
    expect(xOfTileZero(400)).toBeGreaterThan(xOfTileZero(200));

    const xOfTileZeroLeft = (offset: number) =>
      tileOffsets(offset, 941, 941, 'left').find((tile) => tile.index === 0)!.x;
    expect(xOfTileZeroLeft(200)).toBeLessThan(xOfTileZeroLeft(0));
  });

  it('keeps a tile’s mirroring stable as it recycles', () => {
    const width = 941;
    // Follow one tile index across several wraps; its parity must never change.
    const parityOf = new Map<number, boolean>();
    for (let offset = 0; offset < width * 6; offset += 53) {
      for (const tile of tileOffsets(offset, width, width, 'right')) {
        const mirrored = isMirroredTile(tile.index);
        if (parityOf.has(tile.index)) {
          expect(parityOf.get(tile.index)).toBe(mirrored);
        } else {
          parityOf.set(tile.index, mirrored);
        }
      }
    }
    expect(parityOf.size).toBeGreaterThan(6);
  });

  it('alternates mirroring so neighbouring edges always match', () => {
    for (const tile of tileOffsets(400, 941, 941, 'right')) {
      expect(isMirroredTile(tile.index)).toBe(!isMirroredTile(tile.index + 1));
    }
    // Negative indices behave too, which matters once the world scrolls right.
    expect(isMirroredTile(-1)).toBe(true);
    expect(isMirroredTile(-2)).toBe(false);
  });
});

describe('ParallaxController', () => {
  const build = () =>
    new ParallaxController([
      { key: 'far', relativeSpeed: PARALLAX_SPEED.far, width: 941 },
      { key: 'mid', relativeSpeed: PARALLAX_SPEED.mid, width: 941 },
      { key: 'road', relativeSpeed: PARALLAX_SPEED.road, width: 941 },
    ]);

  it('moves the road fastest and the sky slowest', () => {
    const p = build();
    p.setSpeed(600);
    p.update(500);
    expect(p.offsetOf('road')).toBeGreaterThan(p.offsetOf('mid'));
    expect(p.offsetOf('mid')).toBeGreaterThan(p.offsetOf('far'));
  });

  it('keeps every offset wrapped inside the tile width', () => {
    const p = build();
    p.setSpeed(900);
    for (let i = 0; i < 400; i++) p.update(16.7);
    for (const key of ['far', 'mid', 'road']) {
      expect(p.offsetOf(key)).toBeGreaterThanOrEqual(0);
      expect(p.offsetOf(key)).toBeLessThan(941);
    }
  });

  it('stops dead and resets to zero', () => {
    const p = build();
    p.setSpeed(600);
    p.update(200);
    p.setSpeed(0);
    const held = p.offsetOf('road');
    p.update(500);
    expect(p.offsetOf('road')).toBe(held);
    p.reset();
    expect(p.offsetOf('road')).toBe(0);
    expect(p.currentSpeed).toBe(0);
  });
});
