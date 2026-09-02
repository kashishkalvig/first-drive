import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CRITICAL_IMAGE_PATHS, DEFERRED_IMAGE_PATHS } from '../config/assets';
import { COPY } from '../config/copy';
import { LAYOUT } from '../config/experience';
import { timingFor } from '../animation/timings';
import { forgetManifest, loadManifest, type AssetManifest } from '../config/manifest';
import { useAssetPreloader } from '../hooks/useAssetPreloader';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SceneDirector } from '../animation/SceneDirector';
import type { StageMetrics } from '../rendering/viewport';
import type { SceneName } from '../scenes/sceneTypes';
import { ExperienceStage } from './ExperienceStage';
import { Flourish } from './Flourish';
import '../styles/experience.css';

/** Where the live copy sits, in design pixels. */
const UI = {
  openingText: 214,
  openingCta: 1408,
  keyText: 214,
  keyCta: 830,
  drivingText: 196,
  drivingChip: 430,
  drivingCaption: 1218,
  finaleText: 128,
  finaleReplay: 1452,
} as const;

export function FirstDriveExperience() {
  const reduced = useReducedMotion();
  const [attempt, setAttempt] = useState(0);

  const criticalPaths = useMemo(() => CRITICAL_IMAGE_PATHS, []);
  const deferredPaths = useMemo(() => DEFERRED_IMAGE_PATHS, []);
  const preload = useAssetPreloader(criticalPaths, deferredPaths, attempt);

  const [manifest, setManifest] = useState<AssetManifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [scene, setScene] = useState<SceneName>('PRELOAD');

  const directorRef = useRef<SceneDirector | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const metricsRef = useRef<StageMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    setManifestError(null);
    loadManifest().then(
      (loaded) => {
        if (!cancelled) setManifest(loaded);
      },
      (reason: Error) => {
        if (!cancelled) setManifestError(reason.message);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const handleCanvas = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const handleMetrics = useCallback((metrics: StageMetrics) => {
    metricsRef.current = metrics;
    directorRef.current?.resize(metrics);
  }, []);

  // The director is created once both the manifest and the critical art exist.
  useEffect(() => {
    if (!manifest || preload.phase !== 'ready' || !canvasRef.current) return;

    const director = new SceneDirector(
      canvasRef.current,
      manifest,
      preload.images,
      reduced,
      { onSceneChange: setScene },
    );
    directorRef.current = director;

    if (metricsRef.current) director.resize(metricsRef.current);
    director.start();
    director.transition('OPENING');

    return () => {
      director.dispose();
      directorRef.current = null;
    };
  }, [manifest, preload.phase, preload.images, reduced]);

  // A hidden tab should not bank up seconds of animation to replay on return.
  useEffect(() => {
    const onVisibility = () => directorRef.current?.setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /**
   * Opening tap. The director rejects the call unless the machine is exactly at
   * OPENING and idle, so a double tap cannot start the reveal twice, and the
   * reveal then runs to the key with no second tap required.
   */
  const handleBegin = useCallback(() => {
    const director = directorRef.current;
    director?.transition('REVEAL', () => {
      // The key arrives after the reveal timeline has fully settled, so an
      // eager click cannot race the transition lock.
      directorRef.current?.transition('KEY');
    });
  }, [reduced]);

  const handleKey = useCallback(() => {
    const director = directorRef.current;
    if (!director) return;

    // playKeyActivation refuses while the machine is not idle at KEY, so a
    // second tap during the unlock cannot queue another drive.
    director.playKeyActivation(() => {
      const current = directorRef.current;
      if (!current?.transition('DRIVING')) return;

      const driveHold = 2;
      window.setTimeout(() => {
        const running = directorRef.current;
        if (!running) return;
        if (!running.transition('PARKED')) return;
        window.setTimeout(() => {
          const parked = directorRef.current;
          if (!parked || !parked.transition('ARRIVAL')) return;
          const arrival = timingFor(reduced).arrivalTotal;
          window.setTimeout(() => directorRef.current?.transition('COMPLETE'), arrival * 1000);
        }, 4000);
      }, driveHold * 1000);
    });
  }, [reduced]);

  const handleReplay = useCallback(() => {
    directorRef.current?.replay();
  }, []);

  const loading = preload.phase === 'loading' || (!manifest && !manifestError);
  const failed = preload.phase === 'failed' || Boolean(manifestError);
  const ready = !loading && !failed;

  const keyRect = LAYOUT.key.key;
  const keyHit = {
    left: keyRect[0] - 60,
    top: LAYOUT.key.keyCentreY - keyRect[3] / 2 - 40,
    width: keyRect[2] + 120,
    height: keyRect[3] + 80,
  };

  const showOpeningCopy = scene === 'OPENING';
  const showKeyCopy = scene === 'KEY';
  const showDriving = scene === 'DRIVING';
  const showFinale = scene === 'ARRIVAL' || scene === 'COMPLETE';

  return (
    /* `data-scene` is the scene machine's state, surfaced on the DOM so the
       smoke test can follow the story without reaching into React internals. */
    <div className="experience" data-scene={scene}>
      <ExperienceStage onCanvas={handleCanvas} onMetrics={handleMetrics}>
        {/* Opening */}
        <div
          className="overlay-block"
          style={{ top: UI.openingText }}
          data-hidden={!showOpeningCopy}
          aria-hidden={!showOpeningCopy}
        >
          <Flourish className="flourish-top" />
          <h1 className="headline">{COPY.opening.title}</h1>
          <Flourish className="flourish-bottom" />
          <p className="subline">{COPY.opening.subtitle}</p>
        </div>

        <div
          className="overlay-block"
          style={{ top: UI.openingCta }}
          data-hidden={!showOpeningCopy}
          aria-hidden={!showOpeningCopy}
        >
          <button
            type="button"
            className="pill pill-cta"
            data-testid="opening-cta"
            onClick={handleBegin}
            disabled={!ready || !showOpeningCopy}
            tabIndex={showOpeningCopy ? 0 : -1}
            aria-label={COPY.opening.ctaAria}
          >
            {COPY.opening.cta}
          </button>
        </div>

        {/* Key */}
        <div
          className="overlay-block"
          style={{ top: UI.keyText }}
          data-hidden={!showKeyCopy}
          aria-hidden={!showKeyCopy}
        >
          <Flourish className="flourish-top" />
          <h1 className="headline headline-sm">{COPY.key.title}</h1>
          <Flourish className="flourish-bottom" />
          <p className="subline">{COPY.key.hint}</p>
        </div>

        <button
          type="button"
          className="key-hit"
          data-testid="key-hit"
          style={keyHit}
          onClick={handleKey}
          disabled={!showKeyCopy}
          tabIndex={showKeyCopy ? 0 : -1}
          aria-label={COPY.key.ctaAria}
        />

        <div
          className="overlay-block"
          style={{ top: UI.keyCta }}
          data-hidden={!showKeyCopy}
          aria-hidden={!showKeyCopy}
        >
          <button
            type="button"
            className="pill pill-cta"
            data-testid="key-cta"
            onClick={handleKey}
            disabled={!showKeyCopy}
            tabIndex={-1}
          >
            {COPY.key.cta}
          </button>
        </div>

        {/* Driving */}
        <div
          className="overlay-block"
          style={{ top: UI.drivingText }}
          data-hidden={!showDriving}
          aria-hidden={!showDriving}
        >
          <Flourish className="flourish-top" />
          <h1 className="headline headline-sm">{COPY.driving.title}</h1>
          <Flourish className="flourish-bottom" />
        </div>

        {/* Finale */}
        <div
          className="overlay-block overlay-block-wide"
          style={{ top: UI.finaleText }}
          data-hidden={!showFinale}
          aria-hidden={!showFinale}
        >
          <Flourish className="flourish-top" />
          <h1 className="headline headline-finale">{COPY.finale.title}</h1>
          <Flourish className="flourish-bottom" />
          <p className="subline">{COPY.finale.body}</p>
          <p className="finale-date">{COPY.finale.date}</p>
        </div>

        {scene === 'COMPLETE' ? (
          <div className="replay" style={{ top: UI.finaleReplay }}>
            <button type="button" className="pill" data-testid="replay" onClick={handleReplay}>
              {COPY.finale.replay}
            </button>
          </div>
        ) : null}
      </ExperienceStage>

      {loading ? (
        <div className="veil" role="status" aria-live="polite">
          <span className="veil-glow" />
          <span className="veil-track">
            <span
              className="veil-fill"
              style={{ width: `${Math.round(preload.progress * 100)}%` }}
            />
          </span>
          <span>{COPY.loading}</span>
        </div>
      ) : null}

      {failed ? (
        <div className="veil veil-error" role="alert">
          <p>Something didn’t load.</p>
          <button
            type="button"
            className="pill"
            onClick={() => {
              forgetManifest();
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}
