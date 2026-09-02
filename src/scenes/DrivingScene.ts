import { ASSET_PATHS } from '../config/assets';
import { DESIGN, LAYOUT } from '../config/experience';
import { isMirroredTile, tileOffsets } from '../animation/ParallaxController';
import { drawMaskedSpriteFrame, drawSpriteFrame } from '../rendering/drawSpriteFrame';
import { sheet, type World } from './sceneTypes';
import type { Rect } from '../config/manifest';

/** The car is assembled inside a 512x512 space, then mapped into the scene. */
const ASSEMBLY_SIZE = 512;

/**
 * Side-view drive through Melbourne suburbia.
 *
 * The car holds its place in frame and the world moves past it: sky barely at
 * all, houses gently, road at full speed. The vehicle is not one sprite but an
 * assembly — body with the window cut out, two wheels dropped into the arches,
 * and the driver composited behind the body and clipped to the window so she
 * can never appear over the door or roof.
 */
export function drawDriving(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images, parallax } = world;
  if (state.drivingAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = state.drivingAlpha;

  drawLayer(ctx, images.get(ASSET_PATHS.backgrounds.drivingFar), parallax.offsetOf('far'));
  drawLayer(ctx, images.get(ASSET_PATHS.backgrounds.drivingMid), parallax.offsetOf('mid'));
  drawLayer(ctx, images.get(ASSET_PATHS.backgrounds.drivingRoad), parallax.offsetOf('road'));

  drawCarAssembly(ctx, world);

  ctx.restore();
}

/**
 * Draws one repeating layer, mirroring every second tile.
 *
 * The plates are scene paintings rather than seamless tiles, so butting copies
 * together leaves a hard vertical edge. Flipping alternate copies means each
 * join is an edge against a mirror of itself, which is continuous by
 * construction — and on foliage, rooflines and a road it reads as more scenery
 * rather than as a repeat.
 */
function drawLayer(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | undefined,
  offset: number,
): void {
  if (!image) return;
  for (const tile of tileOffsets(offset, DESIGN.width, DESIGN.width, 'right')) {
    if (isMirroredTile(tile.index)) {
      ctx.save();
      ctx.translate(tile.x + DESIGN.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, DESIGN.width, DESIGN.height);
      ctx.restore();
    } else {
      ctx.drawImage(image, tile.x, 0, DESIGN.width, DESIGN.height);
    }
  }
}

export function drawCarAssembly(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images, anim } = world;
  const carSheet = sheet(world, 'silverLiftback');
  const carImage = images.get(ASSET_PATHS.sprites.silverCar);
  if (!carImage) return;

  // Tuned rect, not the manifest's: see LAYOUT.driving.carAssembly.
  const base = LAYOUT.driving.carAssembly;
  const assembly: Rect = [base[0], base[1] + state.carBob, base[2], base[3]];
  const scale = assembly[2] / ASSEMBLY_SIZE;

  /** Maps a rect inside the 512 assembly space into scene coordinates. */
  const place = (rect: Rect): Rect => [
    assembly[0] + rect[0] * scale,
    assembly[1] + rect[1] * scale,
    rect[2] * scale,
    rect[3] * scale,
  ];

  const shadowImage = images.get(ASSET_PATHS.sprites.contactShadows);
  if (shadowImage) {
    drawSpriteFrame(ctx, shadowImage, sheet(world, 'contactShadows'), 1, assembly);
  }

  // Driver first, behind the body, showing only through the window cut-out.
  // Her rect is measured rather than the manifest's — see LAYOUT.driving.
  const driverImage = images.get(ASSET_PATHS.sprites.womanDriver);
  const maskImage = images.get(ASSET_PATHS.overlays.driverWindowMask);
  if (driverImage && maskImage) {
    drawMaskedSpriteFrame(
      ctx,
      world.scratch,
      driverImage,
      sheet(world, 'womanDriver'),
      anim.driver.frame,
      maskImage,
      assembly,
      LAYOUT.driving.driverFrame,
    );
  }

  // Body over her: frame 3 is the side profile with the wheels omitted.
  drawSpriteFrame(ctx, carImage, carSheet, 3, assembly);

  // Wheels into their arches; frame 5 is the motion-blurred variant. The rects
  // are measured rather than taken from the manifest — see LAYOUT.driving.
  const wheelFrame = state.wheelSpinning ? 5 : 4;
  drawSpriteFrame(ctx, carImage, carSheet, wheelFrame, place(LAYOUT.driving.frontWheel));
  drawSpriteFrame(ctx, carImage, carSheet, wheelFrame, place(LAYOUT.driving.rearWheel));
}
