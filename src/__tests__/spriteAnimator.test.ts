import { describe, expect, it, vi } from 'vitest';
import { SpriteAnimator } from '../animation/SpriteAnimator';
import type { SheetDefinition } from '../config/manifest';

const sheet: SheetDefinition = {
  src: 'sprites/red_cover_reveal_2x4_portrait.png',
  size: [1024, 2048],
  grid: [2, 4],
  cell: [512, 512],
  anchor: [0.5, 0.8],
  fps: 8,
  loop: false,
  frames: ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'],
};

describe('SpriteAnimator', () => {
  it('advances on elapsed time, not on how often update is called', () => {
    const a = new SpriteAnimator(sheet, { fps: 10, mode: 'once' });
    // Twelve 10 ms steps and one 120 ms step both cover 120 ms.
    for (let i = 0; i < 12; i++) a.update(10);
    const stepped = a.frame;

    const b = new SpriteAnimator(sheet, { fps: 10, mode: 'once' });
    b.update(120);
    expect(b.frame).toBe(stepped);
    expect(stepped).toBe(1);
  });

  it('honours a frame range', () => {
    const a = new SpriteAnimator(sheet, { from: 2, to: 4, fps: 10, mode: 'once' });
    expect(a.frame).toBe(2);
    // Driven at a realistic frame interval; a single huge delta is deliberately
    // clamped, so time has to actually pass for the range to play out.
    for (let elapsed = 0; elapsed < 400; elapsed += 16) a.update(16);
    expect(a.frame).toBe(4);
    expect(a.isFinished).toBe(true);
  });

  it('loops back to the range start', () => {
    const a = new SpriteAnimator(sheet, { from: 0, to: 2, fps: 100, mode: 'loop' });
    a.update(10); // -> 1
    a.update(10); // -> 2
    a.update(10); // wraps -> 0
    expect(a.frame).toBe(0);
  });

  it('ping-pongs without repeating the end frame', () => {
    const a = new SpriteAnimator(sheet, { from: 0, to: 2, fps: 100, mode: 'pingpong' });
    const seen = [a.frame];
    for (let i = 0; i < 4; i++) {
      a.update(10);
      seen.push(a.frame);
    }
    expect(seen).toEqual([0, 1, 2, 1, 0]);
  });

  it('plays in reverse when asked', () => {
    const a = new SpriteAnimator(sheet, { fps: 100, mode: 'once', reverse: true });
    expect(a.frame).toBe(7);
    a.update(10);
    expect(a.frame).toBe(6);
  });

  it('fires completion exactly once for a one-shot', () => {
    const onComplete = vi.fn();
    const a = new SpriteAnimator(sheet, { fps: 100, mode: 'once', onComplete });
    a.update(1000);
    a.update(1000);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(a.isFinished).toBe(true);
    expect(a.frame).toBe(7);
  });

  it('clamps a huge delta so a hidden tab does not fast-forward', () => {
    const a = new SpriteAnimator(sheet, { fps: 8, mode: 'once' });
    a.update(60_000);
    // A minute of stalled time buys at most MAX_DELTA_MS of animation, so the
    // sheet resumes where it paused instead of snapping to its last frame.
    expect(a.frame).toBeLessThanOrEqual(1);
    expect(a.isFinished).toBe(false);

    const steady = new SpriteAnimator(sheet, { fps: 8, mode: 'once' });
    for (let i = 0; i < 8; i++) steady.update(125);
    expect(steady.frame).toBeGreaterThan(a.frame);
  });

  it('pauses, resumes and resets', () => {
    const a = new SpriteAnimator(sheet, { fps: 100, mode: 'loop' });
    a.update(10);
    a.pause();
    const held = a.frame;
    a.update(1000);
    expect(a.frame).toBe(held);
    a.resume();
    a.update(10);
    expect(a.frame).not.toBe(held);
    a.reset();
    expect(a.frame).toBe(0);
  });

  it('holds a single frame when told to', () => {
    const a = new SpriteAnimator(sheet, { fps: 100, mode: 'loop' });
    a.setFrameByName('f5');
    expect(a.frame).toBe(5);
    a.update(1000);
    expect(a.frame).toBe(5);
    expect(a.isPlaying).toBe(false);
  });
});
