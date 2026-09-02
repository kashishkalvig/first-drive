import type { SheetDefinition } from '../config/manifest';
import { drawSpriteFrame } from '../rendering/drawSpriteFrame';

export type ParticleSpawn = {
  frame: number;
  x: number;
  y: number;
  size: number;
  /** Design px per second. */
  vx: number;
  vy: number;
  /** Design px per second squared; gentle upward drift uses a negative value. */
  gravity?: number;
  lifetime: number;
  spin?: number;
  delay?: number;
  fadeIn?: number;
};

type Particle = ParticleSpawn & {
  active: boolean;
  age: number;
  rotation: number;
};

/**
 * Fixed-size pool of celebratory sprites.
 *
 * The pool is allocated once and reused, so a replay cannot leak particles and
 * a burst cannot allocate mid-frame. The cap is deliberately small: the brief
 * asks for a restrained sparkle, not a confetti storm, and the canvas is never
 * asked to composite more than a couple of dozen extra draws.
 */
export class ParticleSystem {
  private pool: Particle[];
  private sheet: SheetDefinition;

  constructor(sheet: SheetDefinition, capacity = 28) {
    this.sheet = sheet;
    this.pool = Array.from({ length: capacity }, () => ({
      active: false,
      age: 0,
      rotation: 0,
      frame: 0,
      x: 0,
      y: 0,
      size: 0,
      vx: 0,
      vy: 0,
      gravity: 0,
      lifetime: 1,
      spin: 0,
      delay: 0,
      fadeIn: 0.15,
    }));
  }

  spawn(spec: ParticleSpawn): boolean {
    const slot = this.pool.find((particle) => !particle.active);
    if (!slot) return false;
    Object.assign(slot, spec, { active: true, age: 0, rotation: 0 });
    return true;
  }

  burst(specs: ParticleSpawn[]): void {
    for (const spec of specs) this.spawn(spec);
  }

  update(deltaMs: number): void {
    const seconds = Math.min(deltaMs, 120) / 1000;
    for (const particle of this.pool) {
      if (!particle.active) continue;
      particle.age += seconds;
      const delay = particle.delay ?? 0;
      if (particle.age < delay) continue;

      const live = particle.age - delay;
      if (live >= particle.lifetime) {
        particle.active = false;
        continue;
      }

      particle.x += particle.vx * seconds;
      particle.y += particle.vy * seconds;
      particle.vy += (particle.gravity ?? 0) * seconds;
      particle.rotation += (particle.spin ?? 0) * seconds;
    }
  }

  draw(ctx: CanvasRenderingContext2D, image: CanvasImageSource): void {
    for (const particle of this.pool) {
      if (!particle.active) continue;
      const delay = particle.delay ?? 0;
      if (particle.age < delay) continue;

      const live = particle.age - delay;
      const progress = live / particle.lifetime;
      const fadeIn = particle.fadeIn ?? 0.15;
      const alpha =
        progress < fadeIn
          ? progress / fadeIn
          : 1 - Math.max(0, (progress - 0.55) / 0.45);

      if (alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha);
      ctx.translate(particle.x, particle.y);
      if (particle.rotation) ctx.rotate(particle.rotation);
      drawSpriteFrame(ctx, image, this.sheet, particle.frame, [
        -particle.size / 2,
        -particle.size / 2,
        particle.size,
        particle.size,
      ]);
      ctx.restore();
    }
  }

  get activeCount(): number {
    return this.pool.reduce((count, particle) => count + (particle.active ? 1 : 0), 0);
  }

  clear(): void {
    for (const particle of this.pool) {
      particle.active = false;
      particle.age = 0;
    }
  }
}
