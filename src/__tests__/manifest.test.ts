import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assertManifestShape, frameIndex, type AssetManifest } from '../config/manifest';

const manifest = JSON.parse(
  readFileSync('public/assets/first-drive/asset-manifest.json', 'utf8'),
) as AssetManifest;

describe('shipped manifest', () => {
  it('passes its own shape validation', () => {
    expect(() => assertManifestShape(manifest)).not.toThrow();
  });

  it('declares the 941x1672 design viewport the app is built around', () => {
    expect(manifest.designViewport.width).toBe(941);
    expect(manifest.designViewport.height).toBe(1672);
  });

  it('has a grid that fits inside every sheet’s stated pixel size', () => {
    for (const [name, sheet] of Object.entries(manifest.spriteSheets)) {
      const [columns, rows] = sheet.grid;
      const [cellWidth, cellHeight] = sheet.cell;
      expect(columns * cellWidth, `${name} width`).toBeLessThanOrEqual(sheet.size[0]);
      expect(rows * cellHeight, `${name} height`).toBeLessThanOrEqual(sheet.size[1]);
    }
  });

  it('keeps the cover and the reveal car on matching 512 cells', () => {
    const cover = manifest.spriteSheets.redCoverReveal;
    const car = manifest.spriteSheets.silverLiftback;
    expect(cover.cell).toEqual([512, 512]);
    expect(car.cell).toEqual([512, 512]);
    expect(cover.mustShareDestinationRectWith).toBe('silverLiftback:0');
  });

  it('names every frame the scenes look up', () => {
    expect(frameIndex(manifest.spriteSheets.silverLiftback, 'driving-side-body-no-wheels')).toBe(3);
    expect(frameIndex(manifest.spriteSheets.silverLiftback, 'wheel-static')).toBe(4);
    expect(frameIndex(manifest.spriteSheets.silverLiftback, 'wheel-spinning')).toBe(5);
    expect(frameIndex(manifest.spriteSheets.keyFx, 'key-pressed')).toBe(2);
    expect(frameIndex(manifest.spriteSheets.keyFx, 'gold-radial-burst')).toBe(4);
    expect(frameIndex(manifest.spriteSheets.redCoverReveal, 'fully-covered')).toBe(0);
  });

  it('places both wheels inside the car assembly space', () => {
    const assembly = manifest.spriteSheets.silverLiftback.drivingAssembly!;
    for (const rect of [assembly.frontWheelRect, assembly.rearWheelRect]) {
      const [x, y, w, h] = rect;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + w).toBeLessThanOrEqual(512);
      expect(y + h).toBeLessThanOrEqual(512);
    }
    // Front wheel sits ahead of the rear one on a left-facing car.
    expect(assembly.frontWheelRect[0]).toBeLessThan(assembly.rearWheelRect[0]);
    // Both sit on the same axle line, or the car would look bent.
    expect(assembly.frontWheelRect[1]).toBe(assembly.rearWheelRect[1]);
    expect(assembly.frontWheelRect[3]).toBe(assembly.rearWheelRect[3]);
  });

  it('gives the parallax layers the speeds the brief specifies', () => {
    expect(manifest.backgrounds.drivingFar.relativeSpeed).toBe(0.08);
    expect(manifest.backgrounds.drivingMidground.relativeSpeed).toBe(0.35);
    expect(manifest.backgrounds.drivingForegroundRoad.relativeSpeed).toBe(1.0);
  });

  it('rejects a sheet whose frames overflow its grid', () => {
    const broken = JSON.parse(JSON.stringify(manifest)) as AssetManifest;
    broken.spriteSheets.keyFx.frames.push('one-too-many');
    expect(() => assertManifestShape(broken)).toThrow(/frames but the grid holds/);
  });
});
