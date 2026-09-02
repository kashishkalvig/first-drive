import { REDUCED_TIMING, TIMING } from '../config/experience';

export type Timing = {
  openingFadeIn: number;
  openingTextOut: number;
  tapAck: number;
  keyRise: number;
  keyUnlock: number;
  revealTotal: number;
  drivingCruise: number;
  arrivalTotal: number;
};

/**
 * Flattens the two timing tables into one shape.
 *
 * Reduced motion is not a separate code path through the experience — it is the
 * same beats with smaller numbers — so scene code asks for a `Timing` and never
 * branches on the preference itself.
 */
export function timingFor(reduced: boolean): Timing {
  if (reduced) {
    return {
      openingFadeIn: REDUCED_TIMING.openingFadeIn,
      openingTextOut: REDUCED_TIMING.openingTextOut,
      tapAck: 0.08,
      keyRise: REDUCED_TIMING.key.total,
      keyUnlock: REDUCED_TIMING.key.total,
      revealTotal: REDUCED_TIMING.reveal.total + 0.3,
      drivingCruise: REDUCED_TIMING.driving.total,
      arrivalTotal: REDUCED_TIMING.arrival.total + 0.4,
    };
  }
  return {
    openingFadeIn: TIMING.openingFadeIn,
    openingTextOut: TIMING.openingTextOut,
    tapAck: 0.16,
    keyRise: TIMING.key.riseIn,
    keyUnlock: TIMING.key.pressed + TIMING.key.rotate + TIMING.key.whiteOut,
    revealTotal: TIMING.reveal.celebrateEnd + TIMING.reveal.settle,
    drivingCruise: TIMING.driving.cruise,
    arrivalTotal: TIMING.arrival.crossFade + TIMING.arrival.walk + TIMING.arrival.copyIn,
  };
}

/** Tap to the chest of the drive: how long the key's own timeline runs. */
export function unlockDuration(timing: Timing): number {
  return timing.tapAck + timing.keyUnlock;
}
