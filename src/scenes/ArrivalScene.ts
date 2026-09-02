import { ASSET_PATHS } from '../config/assets';
import { DESIGN, LAYOUT } from '../config/experience';
import { drawSpriteFrame, fitToCell } from '../rendering/drawSpriteFrame';
import { layoutRect, sheet, type World } from './sceneTypes';

/**
 * Craigieburn Station at dawn: the car parked, and her walking in.
 *
 * Both remain in frame, as the approved arrival reference shows — the car she
 * drove and the walk she is about to take, in one composition. She is
 * back-facing throughout; the supplied sheet has no forward-facing frame, which
 * matches the requirement that her face is never shown.
 */
export function drawArrival(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images, anim } = world;
  if (state.arrivalAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = state.arrivalAlpha;

  const background = images.get(ASSET_PATHS.backgrounds.station);
  if (background) ctx.drawImage(background, 0, 0, DESIGN.width, DESIGN.height);

  const carRect = layoutRect(world, 'stationFinale', 'carRect', LAYOUT.stationFinale.car);
  const placedCar: [number, number, number, number] = [
    carRect[0] + state.stationCarX,
    carRect[1],
    carRect[2],
    carRect[3],
  ];

  const shadowImage = images.get(ASSET_PATHS.sprites.contactShadows);
  if (shadowImage) {
    drawSpriteFrame(ctx, shadowImage, sheet(world, 'contactShadows'), 2, placedCar);
  }

  const carImage = images.get(ASSET_PATHS.sprites.silverCar);
  if (carImage) {
    // Frame 2 is the three-quarter rear view the arrival reference uses.
    drawSpriteFrame(ctx, carImage, sheet(world, 'silverLiftback'), 2, placedCar);
  }

  drawFinaleMascots(ctx, world);

  const walkImage = images.get(ASSET_PATHS.sprites.womanWalk);
  if (walkImage && state.womanAlpha > 0) {
    const walkSheet = sheet(world, 'womanWalk');
    const [x, y, w, h] = fitToCell(
      walkSheet,
      layoutRect(world, 'stationFinale', 'womanRect', LAYOUT.stationFinale.woman),
    );
    ctx.save();
    ctx.globalAlpha *= state.womanAlpha;
    drawSpriteFrame(ctx, walkImage, walkSheet, anim.walk.frame, [
      x + state.womanX,
      y + state.womanY,
      w,
      h,
    ]);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Panda and duck seeing her off from the foreground corners.
 *
 * They ping-pong between their two cheer frames rather than holding a pose, so
 * the finale keeps a small pulse of life under the message without anything
 * looping distractingly.
 */
function drawFinaleMascots(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images, anim } = world;
  if (state.mascotFinaleAlpha <= 0) return;

  const panda = images.get(ASSET_PATHS.sprites.pandaReveal);
  if (panda) {
    const pandaSheet = sheet(world, 'pandaRevealCheer');
    const [x, y, w, h] = fitToCell(pandaSheet, LAYOUT.stationFinale.panda);
    ctx.save();
    ctx.globalAlpha *= state.mascotFinaleAlpha;
    drawSpriteFrame(ctx, panda, pandaSheet, anim.panda.frame, [
      x,
      y + state.pandaOffsetY,
      w,
      h,
    ]);
    ctx.restore();
  }

  const duck = images.get(ASSET_PATHS.sprites.duckReveal);
  if (duck) {
    const duckSheet = sheet(world, 'duckRevealCheer');
    const [x, y, w, h] = fitToCell(duckSheet, LAYOUT.stationFinale.duck);
    ctx.save();
    ctx.globalAlpha *= state.mascotFinaleAlpha;
    drawSpriteFrame(ctx, duck, duckSheet, anim.duck.frame, [
      x,
      y + state.duckOffsetY,
      w,
      h,
    ]);
    ctx.restore();
  }
}

/** Full-frame white wash used to cross the key burst into the drive. */
export function drawFlash(ctx: CanvasRenderingContext2D, world: World): void {
  const { whiteFlash } = world.state;
  if (whiteFlash <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, whiteFlash);
  ctx.fillStyle = '#fff6e2';
  ctx.fillRect(0, 0, DESIGN.width, DESIGN.height);
  ctx.restore();
}

export function drawVignette(ctx: CanvasRenderingContext2D, world: World): void {
  const image = world.images.get(ASSET_PATHS.overlays.vignette);
  if (!image || world.state.vignetteAlpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = world.state.vignetteAlpha;
  ctx.drawImage(image, 0, 0, DESIGN.width, DESIGN.height);
  ctx.restore();
}
