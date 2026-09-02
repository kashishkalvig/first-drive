import { describe, expect, it } from 'vitest';
import { anchoredRect, spriteSourceRect } from '../rendering/drawSpriteFrame';
import type { SheetDefinition } from '../config/manifest';

const cover: SheetDefinition = {
  src: 'sprites/red_cover_reveal_2x4_portrait.png',
  size: [1024, 2048],
  grid: [2, 4],
  cell: [512, 512],
  anchor: [0.5, 0.8],
  frames: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
};

const key: SheetDefinition = {
  src: 'sprites/key_fx_3x4_portrait.png',
  size: [1152, 1536],
  grid: [3, 4],
  cell: [384, 384],
  anchor: [0.5, 0.5],
  frames: Array.from({ length: 12 }, (_, i) => `f${i}`),
};

describe('spriteSourceRect', () => {
  it('walks a 2-column sheet row-major', () => {
    expect(spriteSourceRect(cover, 0)).toEqual({ sx: 0, sy: 0, sw: 512, sh: 512 });
    expect(spriteSourceRect(cover, 1)).toEqual({ sx: 512, sy: 0, sw: 512, sh: 512 });
    expect(spriteSourceRect(cover, 2)).toEqual({ sx: 0, sy: 512, sw: 512, sh: 512 });
    expect(spriteSourceRect(cover, 7)).toEqual({ sx: 512, sy: 1536, sw: 512, sh: 512 });
  });

  it('uses each sheet’s own grid rather than a shared assumption', () => {
    expect(spriteSourceRect(key, 3)).toEqual({ sx: 0, sy: 384, sw: 384, sh: 384 });
    expect(spriteSourceRect(key, 11)).toEqual({ sx: 768, sy: 1152, sw: 384, sh: 384 });
  });

  it('never reads outside the sheet', () => {
    for (const sheet of [cover, key]) {
      const [columns, rows] = sheet.grid;
      const [cellWidth, cellHeight] = sheet.cell;
      for (let i = 0; i < columns * rows; i++) {
        const rect = spriteSourceRect(sheet, i);
        expect(rect.sx + rect.sw).toBeLessThanOrEqual(sheet.size[0]);
        expect(rect.sy + rect.sh).toBeLessThanOrEqual(sheet.size[1]);
      }
      expect(() => spriteSourceRect(sheet, columns * rows)).toThrow(RangeError);
      expect(() => spriteSourceRect(sheet, -1)).toThrow(RangeError);
      expect(cellWidth * columns).toBeLessThanOrEqual(sheet.size[0]);
      expect(cellHeight * rows).toBeLessThanOrEqual(sheet.size[1]);
    }
  });
});

describe('anchoredRect', () => {
  it('puts a bottom-centre anchor’s feet on the given point', () => {
    expect(anchoredRect([0.5, 1], 400, 1200, 200, 300)).toEqual([300, 900, 200, 300]);
  });

  it('centres a [0.5, 0.5] anchor on the point', () => {
    expect(anchoredRect([0.5, 0.5], 100, 100, 40, 60)).toEqual([80, 70, 40, 60]);
  });
});
