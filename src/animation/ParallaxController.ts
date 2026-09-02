/**
 * Horizontal scroll positions for the driving layers.
 *
 * Each layer keeps its own offset, wrapped into [0, width) so a layer can be
 * drawn as two tiles that meet seamlessly however long the drive runs. Speed is
 * a single road velocity multiplied by each layer's relative speed, which is
 * what keeps the parallax coherent when the car accelerates or slows.
 */
export type ParallaxLayer = {
  key: string;
  relativeSpeed: number;
  width: number;
  offset: number;
};

export class ParallaxController {
  private layers: ParallaxLayer[] = [];
  private speed = 0;

  constructor(layers: Array<Omit<ParallaxLayer, 'offset'>>) {
    this.layers = layers.map((layer) => ({ ...layer, offset: 0 }));
  }

  /** Road velocity in design px per second; layers scale from it. */
  setSpeed(pxPerSecond: number): void {
    this.speed = pxPerSecond;
  }

  get currentSpeed(): number {
    return this.speed;
  }

  update(deltaMs: number): void {
    if (this.speed === 0) return;
    const seconds = deltaMs / 1000;
    for (const layer of this.layers) {
      const distance = this.speed * layer.relativeSpeed * seconds;
      layer.offset = wrap(layer.offset + distance, layer.width);
    }
  }

  offsetOf(key: string): number {
    return this.layers.find((layer) => layer.key === key)?.offset ?? 0;
  }

  reset(): void {
    this.speed = 0;
    for (const layer of this.layers) layer.offset = 0;
  }
}

export function wrap(value: number, span: number): number {
  if (span <= 0) return 0;
  return ((value % span) + span) % span;
}

export type ScrollDirection = 'left' | 'right';

export type Tile = {
  /** Left edge in scene coordinates. */
  x: number;
  /** Absolute tile index; its parity decides whether the tile is mirrored. */
  index: number;
};

/**
 * Tiles needed to cover the viewport at a given offset.
 *
 * `offset` is the positive distance the layer has travelled; the direction
 * decides which way that reads. The supplied car faces left, so the scenery
 * scrolls `right`.
 *
 * The index is absolute rather than per-frame so a tile keeps the same parity
 * as it recycles, which is what makes mirrored tiling stable: the supplied
 * plates were not authored to loop — their left and right edges differ by up
 * to 255 — so every second tile is drawn flipped, and the join is then always
 * an edge meeting an identical copy of itself.
 */
export function tileOffsets(
  offset: number,
  tileWidth: number,
  viewportWidth: number,
  direction: ScrollDirection = 'right',
): Tile[] {
  if (tileWidth <= 0) return [{ x: 0, index: 0 }];
  const shift = direction === 'right' ? offset : -offset;
  const first = Math.floor(-shift / tileWidth);
  const last = Math.floor((viewportWidth - shift) / tileWidth);

  const tiles: Tile[] = [];
  for (let index = first; index <= last; index++) {
    tiles.push({ x: index * tileWidth + shift, index });
  }
  return tiles;
}

/** True when this tile must be drawn mirrored to meet its neighbour cleanly. */
export function isMirroredTile(index: number): boolean {
  return ((index % 2) + 2) % 2 === 1;
}
