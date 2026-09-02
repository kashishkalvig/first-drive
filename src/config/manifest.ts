/**
 * Typed view of `asset-manifest.json`, which is the authority for every grid,
 * cell size, frame name, anchor and scene rectangle. Nothing here re-derives a
 * sprite grid by guessing at a sheet's dimensions.
 *
 * The file is fetched rather than imported so the art pack stays a deployable
 * folder rather than something baked into the JS bundle.
 */
import { ASSET_PATHS, assetUrl } from './assets';

export type Rect = [x: number, y: number, width: number, height: number];
export type Vec2 = [x: number, y: number];

export type SheetDefinition = {
  src: string;
  size: Vec2;
  grid: Vec2;
  cell: Vec2;
  anchor: Vec2;
  fps?: number;
  loop?: boolean;
  frames: string[];
  mustShareDestinationRectWith?: string;
  drivingAssembly?: {
    frontWheelRect: Rect;
    rearWheelRect: Rect;
    driverFrameRect: Rect;
    driverClip: string;
  };
};

export type BackgroundDefinition = {
  src: string;
  size: Vec2;
  opaque: boolean;
  repeatX?: boolean;
  relativeSpeed?: number;
};

export type AssetManifest = {
  version: string;
  designViewport: { width: number; height: number; aspectRatio: string };
  spriteSheets: Record<string, SheetDefinition>;
  backgrounds: Record<string, BackgroundDefinition>;
  overlays: Record<string, { src: string; size: Vec2; opaque: boolean }>;
  referenceAssembly: Record<string, Record<string, Rect>>;
  sceneLayerOrder: Record<string, string[]>;
};

let pending: Promise<AssetManifest> | null = null;

/**
 * Fetches and validates the manifest once per page load.
 *
 * The promise is memoised because React's development double-mount would
 * otherwise start a second request and abort the first, which shows up as a
 * failed request in the network log for no useful reason. `reload` clears the
 * cache so the retry button genuinely retries.
 */
export function loadManifest(): Promise<AssetManifest> {
  pending ??= fetch(assetUrl(ASSET_PATHS.data.manifest))
    .then(async (response) => {
      if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
      const manifest = (await response.json()) as AssetManifest;
      assertManifestShape(manifest);
      return manifest;
    })
    .catch((reason: unknown) => {
      pending = null;
      throw reason;
    });
  return pending;
}

export function forgetManifest(): void {
  pending = null;
}

/**
 * Fails loudly on a manifest that could not drive the renderer, rather than
 * letting a missing grid surface later as sprites cropped from the wrong place.
 */
export function assertManifestShape(manifest: AssetManifest): void {
  if (!manifest?.spriteSheets || !manifest?.backgrounds) {
    throw new Error('Manifest is missing spriteSheets or backgrounds');
  }
  for (const [name, sheet] of Object.entries(manifest.spriteSheets)) {
    const [columns, rows] = sheet.grid ?? [];
    const [cellWidth, cellHeight] = sheet.cell ?? [];
    if (!columns || !rows || !cellWidth || !cellHeight) {
      throw new Error(`Sheet "${name}" is missing grid or cell dimensions`);
    }
    if (sheet.frames.length > columns * rows) {
      throw new Error(
        `Sheet "${name}" declares ${sheet.frames.length} frames but the grid holds ${columns * rows}`,
      );
    }
  }
}

/** Index of a named frame, so scene code never hard-codes frame numbers. */
export function frameIndex(sheet: SheetDefinition, frameName: string): number {
  const index = sheet.frames.indexOf(frameName);
  if (index < 0) {
    throw new Error(`Unknown frame "${frameName}" (have: ${sheet.frames.join(', ')})`);
  }
  return index;
}
