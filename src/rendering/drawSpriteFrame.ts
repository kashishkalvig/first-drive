import type { Rect, SheetDefinition, Vec2 } from '../config/manifest';

export type SourceRect = { sx: number; sy: number; sw: number; sh: number };

/**
 * Row-major source rectangle for one frame of a sheet.
 *
 * Kept pure and separate from any canvas so the arithmetic that every sprite
 * on screen depends on can be tested directly. Sheets do not share cell sizes
 * — the key sheet is 384x384 on a 3x4 grid while the cover is 512x512 on 2x4 —
 * so the grid always comes from the sheet definition, never from an assumption.
 */
export function spriteSourceRect(sheet: SheetDefinition, frameIndex: number): SourceRect {
  const [columns, rows] = sheet.grid;
  const [cellWidth, cellHeight] = sheet.cell;
  const total = columns * rows;

  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= total) {
    throw new RangeError(
      `Frame ${frameIndex} is outside this sheet's ${columns}x${rows} grid (${total} cells)`,
    );
  }

  const column = frameIndex % columns;
  const row = Math.floor(frameIndex / columns);

  return {
    sx: column * cellWidth,
    sy: row * cellHeight,
    sw: cellWidth,
    sh: cellHeight,
  };
}

/**
 * Destination rectangle for a sprite whose anchor should land on a given point.
 * An anchor of [0.5, 1] puts the character's feet on `y`, which is what keeps
 * the mascots planted while their frames change underneath them.
 */
export function anchoredRect(
  anchor: Vec2,
  x: number,
  y: number,
  width: number,
  height: number,
): Rect {
  return [x - anchor[0] * width, y - anchor[1] * height, width, height];
}

/**
 * Fits a sheet's cell into a layout rectangle without distorting it.
 *
 * Several sheets use 512x384 cells while the manifest's placement rectangles
 * are square, so drawing straight into them would stretch the mascots and the
 * walking figure vertically by a third. The rect's width and its anchor point
 * are honoured; the height follows from the cell's own aspect ratio.
 */
export function fitToCell(sheet: SheetDefinition, rect: Rect): Rect {
  const [x, y, width, height] = rect;
  const [cellWidth, cellHeight] = sheet.cell;
  const fittedHeight = (width * cellHeight) / cellWidth;
  const anchorY = sheet.anchor[1];
  // Keep the anchor where the layout put it: a bottom-centre anchor keeps its
  // feet on the same line, a centred one keeps its middle.
  const anchorPointY = y + anchorY * height;
  return [x, anchorPointY - anchorY * fittedHeight, width, fittedHeight];
}

export function drawSpriteFrame(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sheet: SheetDefinition,
  frameIndex: number,
  destination: Rect,
): void {
  const { sx, sy, sw, sh } = spriteSourceRect(sheet, frameIndex);
  const [dx, dy, dw, dh] = destination;
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Draws a sprite frame through an alpha mask.
 *
 * Used for the driver, who has to appear inside the car's side window and
 * nowhere else. The mask is composited with `destination-in` on a scratch
 * canvas so only the window's alpha survives; doing this on the main canvas
 * would erase the scene behind it.
 */
export function drawMaskedSpriteFrame(
  ctx: CanvasRenderingContext2D,
  scratch: HTMLCanvasElement,
  image: CanvasImageSource,
  sheet: SheetDefinition,
  frameIndex: number,
  maskImage: CanvasImageSource,
  destination: Rect,
  /** Where the sprite sits inside the mask's own coordinate space. */
  spriteRectInMaskSpace: Rect,
): void {
  const scratchCtx = scratch.getContext('2d');
  if (!scratchCtx) return;

  const [dx, dy, dw, dh] = destination;
  scratchCtx.clearRect(0, 0, scratch.width, scratch.height);

  const { sx, sy, sw, sh } = spriteSourceRect(sheet, frameIndex);
  const [rx, ry, rw, rh] = spriteRectInMaskSpace;
  scratchCtx.drawImage(image, sx, sy, sw, sh, rx, ry, rw, rh);

  scratchCtx.globalCompositeOperation = 'destination-in';
  scratchCtx.drawImage(maskImage, 0, 0, scratch.width, scratch.height);
  scratchCtx.globalCompositeOperation = 'source-over';

  ctx.drawImage(scratch, 0, 0, scratch.width, scratch.height, dx, dy, dw, dh);
}
