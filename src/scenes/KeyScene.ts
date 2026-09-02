import { ASSET_PATHS } from '../config/assets';
import { LAYOUT } from '../config/experience';
import { drawSpriteFrame } from '../rendering/drawSpriteFrame';
import { layoutRect, sheet, type World } from './sceneTypes';
import type { Rect } from '../config/manifest';

/**
 * The golden key, floating over the revealed car.
 *
 * The key sheet's cells are square (384x384) while the manifest's key rect is
 * 230x330, so the cell is fitted into that rect at its own aspect rather than
 * stretched to fill it — a stretched key reads immediately as wrong, and the
 * brief forbids distorting the supplied art. The rect's centre is honoured,
 * which is what actually places the key in the composition.
 */
function keyDestination(world: World, size: number): Rect {
  const [x, y, w, h] = keyRect(world);
  const centreX = x + w / 2;
  const centreY = y + h / 2;
  return [centreX - size / 2, centreY - size / 2, size, size];
}

/**
 * Where the key sits.
 *
 * The manifest offers `key.keyRect` at y=650 (centre y=815); the approved key
 * reference screen shows the key noticeably higher, around centre y=580, with
 * its prompt directly underneath. The manifest calls its own figures
 * "recommended placements" while the reference screens are the stated
 * composition authority, so the reference wins on Y — which also leaves clean
 * room for the prompt without it colliding with the car's roofline at y=1049.
 * X, width and height are taken from the manifest unchanged.
 */
export function keyRect(world: World): Rect {
  const [x, , w, h] = layoutRect(world, 'key', 'keyRect', LAYOUT.key.key);
  return [x, LAYOUT.key.keyCentreY - h / 2, w, h];
}

export function drawKey(ctx: CanvasRenderingContext2D, world: World): void {
  const { state, images } = world;
  const keyImage = images.get(ASSET_PATHS.sprites.keyFx);
  if (!keyImage) return;

  const keySheet = sheet(world, 'keyFx');
  const [, , , baseHeight] = keyRect(world);

  // Radial burst sits behind the key so the key stays readable through it.
  if (state.keyBurstAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = state.keyBurstAlpha;
    drawSpriteFrame(ctx, keyImage, keySheet, 4, keyDestination(world, baseHeight * 2.6 * state.keyBurstScale));
    ctx.restore();
  }

  if (state.keyRingAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = state.keyRingAlpha;
    drawSpriteFrame(ctx, keyImage, keySheet, 11, keyDestination(world, baseHeight * 1.9 * state.keyRingScale));
    ctx.restore();
  }

  if (state.keyAlpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = state.keyAlpha;

  const size = baseHeight * state.keyScale;
  const [dx, dy, dw, dh] = keyDestination(world, size);
  const centreX = dx + dw / 2;
  const centreY = dy + dh / 2 + state.keyFloat;

  ctx.translate(centreX, centreY);
  ctx.rotate((state.keyRotation * Math.PI) / 180);
  // Poses 0-3 are neutral, hover-glow, pressed and rotate; the glow frame
  // carries the idle state so the key reads as tappable with no DOM decoration
  // sitting over the artwork.
  drawSpriteFrame(ctx, keyImage, keySheet, state.keyPose, [-dw / 2, -dh / 2, dw, dh]);
  ctx.restore();
}

/** Sparkles and hearts released when the key is used. */
export function keyBurstParticles(world: World): void {
  const [x, y, w, h] = keyRect(world);
  const centreX = x + w / 2;
  const centreY = y + h / 2;

  const specs = [
    { frame: 6, size: 150, spread: 120, count: 4, lifetime: 1.15 },
    { frame: 7, size: 110, spread: 190, count: 4, lifetime: 1.35 },
    { frame: 9, size: 95, spread: 165, count: 3, lifetime: 1.5 },
  ];

  for (const spec of specs) {
    for (let i = 0; i < spec.count; i++) {
      const angle = (Math.PI * 2 * i) / spec.count + spec.frame;
      world.particles.spawn({
        frame: spec.frame,
        x: centreX + Math.cos(angle) * 24,
        y: centreY + Math.sin(angle) * 24,
        size: spec.size,
        vx: Math.cos(angle) * spec.spread,
        vy: Math.sin(angle) * spec.spread - 40,
        gravity: 26,
        lifetime: spec.lifetime,
        spin: (i % 2 === 0 ? 1 : -1) * 0.5,
        delay: i * 0.05,
      });
    }
  }
}

/** Big celebratory pop as the cloth comes off the car. */
export function revealSparkleParticles(world: World): void {
  const [x, y, w, h] = layoutRect(world, 'reveal', 'revealGroupRect', LAYOUT.reveal.revealGroup);
  const centreX = x + w / 2;
  const centreY = y + h * 0.45;

  const rings = [
    { frame: 6, amount: 12, radius: 180, size: 220, speed: 120, lift: 120, gravity: 26, lifetime: 1.7 },
    { frame: 7, amount: 10, radius: 220, size: 195, speed: 145, lift: 138, gravity: 32, lifetime: 2.1 },
    { frame: 9, amount: 8, radius: 260, size: 170, speed: 165, lift: 150, gravity: 36, lifetime: 2.3 },
  ];

  for (const ring of rings) {
    for (let i = 0; i < ring.amount; i++) {
      const angle = (Math.PI * 2 * i) / ring.amount + (Math.PI * i) / ring.amount;
      const radial = ring.radius + ((i % 3) - 1) * 28;
      world.particles.spawn({
        frame: ring.frame,
        x: centreX + Math.cos(angle) * radial,
        y: centreY + Math.sin(angle) * (radial * 0.6),
        size: ring.size,
        vx: Math.cos(angle) * ring.speed,
        vy: -ring.lift - (i % 4) * 18,
        gravity: ring.gravity,
        lifetime: ring.lifetime,
        spin: (i % 2 === 0 ? 1 : -1) * 0.65,
        delay: 0.04 * i,
      });
    }
  }
}
