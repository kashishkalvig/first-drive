import { ASSET_PATHS } from '../config/assets';
import { DESIGN, LAYOUT } from '../config/experience';
import { drawSpriteFrame, fitToCell } from '../rendering/drawSpriteFrame';
import { drawMale, drawRevealShadow } from './OpeningScene';
import { layoutRect, sheet, type World } from './sceneTypes';

/**
 * Panda and duck haul the cloth off the car.
 *
 * The car and every cover frame are drawn into the *same* destination
 * rectangle, which is the whole reason the cloth appears to peel off this
 * particular car at this particular angle. The rect is read once and reused;
 * the cover is never independently centred, scaled, rotated or nudged per
 * frame, and the car never moves while the cloth animates over it.
 */
export function drawReveal(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images, anim } = world;

  const background = images.get(ASSET_PATHS.backgrounds.opening);
  if (background) ctx.drawImage(background, 0, 0, DESIGN.width, DESIGN.height);

  drawRevealShadow(ctx, world);

  // One rectangle, shared by the car and the cloth on top of it.
  const revealRect = layoutRect(world, 'reveal', 'revealGroupRect', LAYOUT.reveal.revealGroup);

  const carImage = images.get(ASSET_PATHS.sprites.silverCar);
  if (carImage && state.carAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = state.carAlpha;
    drawSpriteFrame(ctx, carImage, sheet(world, 'silverLiftback'), 0, revealRect);
    ctx.restore();
  }

  const coverImage = images.get(ASSET_PATHS.sprites.redCover);
  if (coverImage && state.coverAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = state.coverAlpha;
    drawSpriteFrame(ctx, coverImage, sheet(world, 'redCoverReveal'), anim.cover.frame, revealRect);
    ctx.restore();
  }

  drawMascots(ctx, world);
}

export function drawMascots(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images, anim } = world;

  const pandaImage = images.get(ASSET_PATHS.sprites.pandaReveal);
  if (pandaImage && state.pandaAlpha > 0) {
    const pandaSheet = sheet(world, 'pandaRevealCheer');
    const [x, y, w, h] = fitToCell(pandaSheet, LAYOUT.reveal.panda);
    ctx.save();
    ctx.globalAlpha = state.pandaAlpha;
    drawSpriteFrame(ctx, pandaImage, pandaSheet, anim.panda.frame, [
      x + state.pandaOffsetX,
      y + state.pandaOffsetY,
      w,
      h,
    ]);
    ctx.restore();
  }

  const duckImage = images.get(ASSET_PATHS.sprites.duckReveal);
  if (duckImage && state.duckAlpha > 0) {
    const duckSheet = sheet(world, 'duckRevealCheer');
    const [x, y, w, h] = fitToCell(duckSheet, LAYOUT.reveal.duck);
    ctx.save();
    ctx.globalAlpha = state.duckAlpha;
    drawSpriteFrame(ctx, duckImage, duckSheet, anim.duck.frame, [
      x + state.duckOffsetX,
      y + state.duckOffsetY,
      w,
      h,
    ]);
    ctx.restore();
  }
}
