import { useEffect, useMemo, useRef, useState } from 'react';
import { assetUrl } from '../config/assets';

export type PreloadPhase = 'loading' | 'ready' | 'failed';

export type PreloadState = {
  phase: PreloadPhase;
  /** Loaded critical images over total critical images, 0..1. Real, not faked. */
  progress: number;
  images: Map<string, HTMLImageElement>;
  error: string | null;
};

/**
 * Loads and decodes images before anything is drawn.
 *
 * Critical images gate the opening screen; deferred images continue loading in
 * the background straight afterwards, so the drive is ready long before the
 * key is tapped. `decode()` is awaited so the first paint of a scene cannot
 * show a half-decoded plate, and a decode rejection is tolerated because some
 * browsers reject for images that will still paint correctly.
 */
export function useAssetPreloader(
  criticalPaths: readonly string[],
  deferredPaths: readonly string[],
  attempt: number,
): PreloadState {
  const [phase, setPhase] = useState<PreloadPhase>('loading');
  const [loadedCount, setLoadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const imagesRef = useRef(new Map<string, HTMLImageElement>());

  useEffect(() => {
    let cancelled = false;
    const images = imagesRef.current;
    setPhase('loading');
    setLoadedCount(0);
    setError(null);

    const load = (path: string) =>
      new Promise<void>((resolve, reject) => {
        const existing = images.get(path);
        if (existing?.complete && existing.naturalWidth > 0) {
          resolve();
          return;
        }
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
          images.set(path, image);
          const settle = () => resolve();
          if (typeof image.decode === 'function') {
            image.decode().then(settle, settle);
          } else {
            settle();
          }
        };
        image.onerror = () => reject(new Error(`Failed to load ${path}`));
        image.src = assetUrl(path);
      });

    const loadTracked = (path: string) =>
      load(path).then(() => {
        if (!cancelled) setLoadedCount((count) => count + 1);
      });

    Promise.all(criticalPaths.map(loadTracked)).then(
      () => {
        if (cancelled) return;
        setPhase('ready');
        // Deferred assets must never be able to fail the experience.
        void Promise.allSettled(deferredPaths.map(load));
      },
      (reason: Error) => {
        if (cancelled) return;
        setError(reason.message);
        setPhase('failed');
      },
    );

    return () => {
      cancelled = true;
    };
  }, [criticalPaths, deferredPaths, attempt]);

  return useMemo(
    () => ({
      phase,
      progress: criticalPaths.length ? loadedCount / criticalPaths.length : 1,
      images: imagesRef.current,
      error,
    }),
    [phase, loadedCount, criticalPaths.length, error],
  );
}
