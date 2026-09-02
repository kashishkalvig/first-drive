/**
 * GSAP eases used across the experience, named once so the motion stays
 * consistent between scenes. Nothing here overshoots hard — the brief calls for
 * a calm first drive, not a bouncy toy.
 */
export const EASE = {
  /** Cloth, camera and general scene motion. */
  smooth: 'power2.inOut',
  /** Entrances that should feel eager but settle cleanly. */
  arrive: 'back.out(1.4)',
  /** Breathing, floating, idle drift. */
  breathe: 'sine.inOut',
  /** Deceleration into a stop. */
  settle: 'power3.out',
  /** Light and opacity ramps. */
  fade: 'power1.inOut',
} as const;
