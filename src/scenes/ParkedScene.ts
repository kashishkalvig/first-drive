import { ASSET_PATHS } from '../config/assets';
import { DESIGN } from '../config/experience';
import type { World } from './sceneTypes';

/** Static second-last card using the supplied parked-car artwork. */
export function drawParked(ctx: CanvasRenderingContext2D, world: World): void {
  const image = world.images.get(ASSET_PATHS.backgrounds.parked);
  if (!image || world.state.parkedAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = world.state.parkedAlpha;
  ctx.drawImage(image, 0, 0, DESIGN.width, DESIGN.height);
  ctx.restore();
}
