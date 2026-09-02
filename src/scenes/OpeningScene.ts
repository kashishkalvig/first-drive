import { ASSET_PATHS } from '../config/assets';
import { DESIGN, LAYOUT } from '../config/experience';
import { drawSpriteFrame } from '../rendering/drawSpriteFrame';
import { layoutRect, sheet, type World } from './sceneTypes';

/**
 * Dawn outside the house: the gate plate, the covered shape on the driveway,
 * and him leaning against the post with his back to us.
 *
 * The car is deliberately not drawn in this scene. The cover's silhouette fully
 * encloses the reveal car's — measured, 0.36% of the car's pixels sit under
 * cloth that is merely near-opaque rather than fully opaque — so compositing
 * the car underneath would leak a thin anti-aliased silver fringe before the
 * reveal. Omitting it entirely makes "no silver pixels before the reveal"
 * absolute rather than nearly true, and looks identical.
 */
export function drawOpening(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images } = world;

  const background = images.get(ASSET_PATHS.backgrounds.opening);
  if (background) {
    ctx.drawImage(background, 0, 0, DESIGN.width, DESIGN.height);
  }

  ctx.save();
  ctx.globalAlpha = state.openingAlpha;

  drawCoveredShape(ctx, world);

  ctx.restore();
}

export function drawCoveredShape(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images, anim } = world;
  const coverImage = images.get(ASSET_PATHS.sprites.redCover);
  if (!coverImage || state.coverAlpha <= 0) return;

  const rect = layoutRect(world, 'opening', 'revealGroupRect', LAYOUT.opening.revealGroup);
  ctx.save();
  ctx.globalAlpha *= state.coverAlpha;
  drawSpriteFrame(ctx, coverImage, sheet(world, 'redCoverReveal'), anim.cover.frame, rect);
  ctx.restore();
}

/**
 * Currently unused: he was removed from both the opening and the reveal, and
 * `createSceneState` starts `maleAlpha` at 0. Kept because putting him back is
 * one call plus that one value, and the sheet still ships.
 */
export function drawMale(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images, anim } = world;
  const maleImage = images.get(ASSET_PATHS.sprites.maleIdle);
  if (!maleImage || state.maleAlpha <= 0) return;

  const rect = layoutRect(world, 'opening', 'maleRect', LAYOUT.opening.male);
  ctx.save();
  ctx.globalAlpha *= state.maleAlpha;
  drawSpriteFrame(ctx, maleImage, sheet(world, 'maleIdle'), anim.male.frame, rect);
  ctx.restore();
}

/** Soft ground shadow under the covered shape, from the shared shadow sheet. */
export function drawRevealShadow(ctx: CanvasRenderingContext2D, world: World): void {
  const shadowImage = world.images.get(ASSET_PATHS.sprites.contactShadows);
  if (!shadowImage) return;
  const rect = layoutRect(world, 'opening', 'revealGroupRect', LAYOUT.opening.revealGroup);
  drawSpriteFrame(ctx, shadowImage, sheet(world, 'contactShadows'), 0, rect);
}
