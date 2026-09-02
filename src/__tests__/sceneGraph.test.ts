import { describe, expect, it } from 'vitest';
import { ALLOWED_TRANSITIONS, SCENE_ORDER, canTransition } from '../animation/sceneGraph';
import type { SceneName } from '../scenes/sceneTypes';

describe('scene transition guards', () => {
  it('runs the story in order', () => {
    for (let i = 1; i < SCENE_ORDER.length; i++) {
      expect(canTransition(SCENE_ORDER[i - 1], SCENE_ORDER[i])).toBe(true);
    }
  });

  it('refuses every move that would skip a scene', () => {
    expect(canTransition('OPENING', 'KEY')).toBe(false);
    expect(canTransition('OPENING', 'DRIVING')).toBe(false);
    expect(canTransition('REVEAL', 'DRIVING')).toBe(false);
    expect(canTransition('KEY', 'ARRIVAL')).toBe(false);
    expect(canTransition('PRELOAD', 'COMPLETE')).toBe(false);
  });

  it('refuses re-entering the scene it is already in, so a double tap is inert', () => {
    for (const scene of SCENE_ORDER) {
      expect(canTransition(scene, scene)).toBe(false);
    }
  });

  it('refuses moving backwards', () => {
    expect(canTransition('REVEAL', 'OPENING')).toBe(false);
    expect(canTransition('DRIVING', 'KEY')).toBe(false);
    expect(canTransition('ARRIVAL', 'DRIVING')).toBe(false);
  });

  it('only allows a replay from the very end', () => {
    const backToOpening = (SCENE_ORDER as SceneName[]).filter((scene) =>
      canTransition(scene, 'OPENING'),
    );
    expect(backToOpening).toEqual(['PRELOAD', 'COMPLETE']);
  });

  it('describes every scene exactly once', () => {
    expect(Object.keys(ALLOWED_TRANSITIONS).sort()).toEqual([...SCENE_ORDER].sort());
  });
});
