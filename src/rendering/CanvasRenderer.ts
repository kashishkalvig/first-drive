import { DESIGN } from '../config/experience';
import type { StageMetrics } from './viewport';

/**
 * Owns the canvas backing store and gives scenes a context that is already in
 * design coordinates.
 *
 * Scenes draw at 941x1672 regardless of the device; the transform set here maps
 * that onto the real backing store, so no scene has to know about the device
 * pixel ratio or the current scale.
 */
export class CanvasRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private metrics: StageMetrics | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas context is unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
  }

  resize(metrics: StageMetrics): void {
    this.metrics = metrics;
    const scale = metrics.renderScale;
    const backingWidth = Math.round(DESIGN.width * scale);
    const backingHeight = Math.round(DESIGN.height * scale);

    // Only touch the backing store when it actually changes; assigning width or
    // height clears the canvas and reallocates it.
    if (this.canvas.width !== backingWidth || this.canvas.height !== backingHeight) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
    }

    // The canvas's CSS size stays at the design size and the stage's transform
    // scales it; setting a viewport-sized style here would scale it twice.
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  get renderScale(): number {
    return this.metrics?.renderScale ?? 1;
  }

  clear(fill = '#0b1026'): void {
    const { ctx } = this;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }
}
