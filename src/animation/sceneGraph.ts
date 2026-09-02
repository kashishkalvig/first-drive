import type { SceneName } from '../scenes/sceneTypes';

/**
 * The only legal moves through the experience.
 *
 * Held apart from `SceneDirector` so the rules can be asserted directly,
 * without a canvas, and so there is exactly one description of them rather than
 * a table plus a scattering of `if` statements in the interaction handlers.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<SceneName, readonly SceneName[]>> = {
  PRELOAD: ['OPENING'],
  OPENING: ['REVEAL'],
  REVEAL: ['KEY'],
  KEY: ['DRIVING'],
  DRIVING: ['PARKED'],
  PARKED: ['ARRIVAL'],
  ARRIVAL: ['COMPLETE'],
  COMPLETE: ['OPENING'],
};

export function canTransition(from: SceneName, to: SceneName): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export const SCENE_ORDER: readonly SceneName[] = [
  'PRELOAD',
  'OPENING',
  'REVEAL',
  'KEY',
  'DRIVING',
  'PARKED',
  'ARRIVAL',
  'COMPLETE',
];
