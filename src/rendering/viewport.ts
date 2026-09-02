import { DESIGN, MAX_DPR, MIN_VISIBLE_WIDTH } from '../config/experience';

export type StageMetrics = {
  scale: number;
  /** CSS pixel size of the scaled stage. */
  cssWidth: number;
  cssHeight: number;
  /** Offset of the stage's top-left within the viewport, in CSS px. */
  offsetX: number;
  offsetY: number;
  dpr: number;
  /**
   * Backing-store multiplier for the canvas.
   *
   * The canvas lives *inside* the stage, which the CSS transform has already
   * scaled, so its CSS size is the design size and only its backing store has
   * to account for the device. One design pixel ends up covering
   * `devicePixelRatio * scale` real pixels, and that product — capped — is what
   * keeps the art sharp without rendering a needlessly large buffer.
   */
  renderScale: number;
};

/**
 * Uniform scale that fits the 941x1672 stage to the viewport.
 *
 * Height is filled first, which is what a portrait phone wants: the stage ends
 * up wider than the screen, so the dark edges of each plate crop away and the
 * art reaches both sides. On a desktop window the stage is narrower than the
 * viewport and simply centres inside a dark surround. The second term is a
 * guard for unusually narrow windows — it stops the stage zooming so far that
 * less than the safe band remains visible, accepting a little letterboxing
 * instead of cropping the composition.
 */
export function computeStageMetrics(
  viewportWidth: number,
  viewportHeight: number,
  devicePixelRatio = 1,
): StageMetrics {
  const scale = Math.min(
    viewportHeight / DESIGN.height,
    viewportWidth / MIN_VISIBLE_WIDTH,
  );
  const cssWidth = DESIGN.width * scale;
  const cssHeight = DESIGN.height * scale;

  const dpr = devicePixelRatio || 1;

  return {
    scale,
    cssWidth,
    cssHeight,
    offsetX: (viewportWidth - cssWidth) / 2,
    offsetY: (viewportHeight - cssHeight) / 2,
    dpr: Math.min(dpr, MAX_DPR),
    renderScale: Math.max(1, Math.min(dpr * scale, MAX_DPR)),
  };
}

/** True when the viewport is wide and short enough to be worth a portrait hint. */
export function isAwkwardLandscape(width: number, height: number): boolean {
  return width > height && height < 560;
}
