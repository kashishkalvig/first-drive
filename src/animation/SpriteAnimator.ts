import type { SheetDefinition } from '../config/manifest';

export type PlayMode = 'once' | 'loop' | 'pingpong';

export type PlayOptions = {
  /** Inclusive frame range. Defaults to the whole sheet. */
  from?: number;
  to?: number;
  fps?: number;
  mode?: PlayMode;
  reverse?: boolean;
  onComplete?: () => void;
};

/**
 * Advances a sprite sheet's current frame from elapsed time.
 *
 * Timing is driven by accumulated milliseconds rather than by counting render
 * frames, so an 8 fps cloth reveal takes the same 1.0 s on a 60 Hz phone, a
 * 120 Hz phone, and a tab that just dropped a handful of frames. `update` also
 * clamps the delta, so returning to a backgrounded tab resumes where it left
 * off instead of fast-forwarding through the whole animation.
 */
export class SpriteAnimator {
  readonly sheet: SheetDefinition;

  private first = 0;
  private last = 0;
  private fps: number;
  private mode: PlayMode = 'once';
  private reverse = false;
  private onComplete?: () => void;

  private cursor = 0;
  private accumulator = 0;
  private direction: 1 | -1 = 1;
  private playing = false;
  private finished = false;

  /** Longest step honoured in one update; anything larger is treated as a stall. */
  static readonly MAX_DELTA_MS = 120;

  constructor(sheet: SheetDefinition, options: PlayOptions = {}) {
    this.sheet = sheet;
    this.fps = options.fps ?? sheet.fps ?? 8;
    this.last = sheet.frames.length - 1;
    this.play(options);
  }

  play(options: PlayOptions = {}): this {
    const lastFrame = this.sheet.frames.length - 1;
    this.first = clamp(options.from ?? 0, 0, lastFrame);
    this.last = clamp(options.to ?? lastFrame, this.first, lastFrame);
    this.fps = options.fps ?? this.sheet.fps ?? this.fps;
    this.mode = options.mode ?? (this.sheet.loop ? 'loop' : 'once');
    this.reverse = options.reverse ?? false;
    this.onComplete = options.onComplete;

    this.cursor = this.reverse ? this.last : this.first;
    this.direction = this.reverse ? -1 : 1;
    this.accumulator = 0;
    this.playing = true;
    this.finished = false;
    return this;
  }

  /** Freezes on one frame without tearing down the animator. */
  setFrame(frame: number): this {
    this.cursor = clamp(frame, 0, this.sheet.frames.length - 1);
    this.accumulator = 0;
    this.playing = false;
    return this;
  }

  setFrameByName(frameName: string): this {
    const index = this.sheet.frames.indexOf(frameName);
    if (index >= 0) this.setFrame(index);
    return this;
  }

  pause(): this {
    this.playing = false;
    return this;
  }

  resume(): this {
    if (!this.finished) this.playing = true;
    return this;
  }

  reset(): this {
    this.cursor = this.reverse ? this.last : this.first;
    this.direction = this.reverse ? -1 : 1;
    this.accumulator = 0;
    this.finished = false;
    this.playing = true;
    return this;
  }

  update(deltaMs: number): void {
    if (!this.playing || this.fps <= 0) return;

    this.accumulator += Math.min(Math.max(deltaMs, 0), SpriteAnimator.MAX_DELTA_MS);
    const step = 1000 / this.fps;
    if (this.accumulator < step) return;

    const steps = Math.floor(this.accumulator / step);
    this.accumulator -= steps * step;
    for (let i = 0; i < steps; i++) this.advance();
  }

  private advance(): void {
    if (this.first === this.last) {
      this.complete();
      return;
    }

    const next = this.cursor + this.direction;

    if (next > this.last || next < this.first) {
      switch (this.mode) {
        case 'loop':
          this.cursor = this.direction === 1 ? this.first : this.last;
          return;
        case 'pingpong':
          this.direction = this.direction === 1 ? -1 : 1;
          this.cursor += this.direction;
          return;
        case 'once':
        default:
          this.cursor = this.direction === 1 ? this.last : this.first;
          this.complete();
          return;
      }
    }

    this.cursor = next;
  }

  private complete(): void {
    if (this.finished) return;
    this.finished = true;
    this.playing = false;
    const callback = this.onComplete;
    this.onComplete = undefined;
    callback?.();
  }

  get frame(): number {
    return this.cursor;
  }

  get frameName(): string {
    return this.sheet.frames[this.cursor] ?? '';
  }

  get isFinished(): boolean {
    return this.finished;
  }

  get isPlaying(): boolean {
    return this.playing;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
