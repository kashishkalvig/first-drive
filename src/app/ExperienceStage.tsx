import { useEffect, useRef, useState, type ReactNode } from 'react';
import { computeStageMetrics, isAwkwardLandscape, type StageMetrics } from '../rendering/viewport';
import { COPY } from '../config/copy';

type Props = {
  onCanvas: (canvas: HTMLCanvasElement) => void;
  onMetrics: (metrics: StageMetrics) => void;
  children: ReactNode;
};

/**
 * Sizes the stage and hands the canvas to the director.
 *
 * The canvas and the DOM overlay are siblings inside one transformed box, so
 * they cannot drift apart: a single scale drives both, and every child is
 * positioned in the same 941x1672 design pixels. Layout is recomputed on
 * resize, orientation change, and visual-viewport changes — the last of which
 * is what a mobile browser fires when its address bar slides away.
 */
export function ExperienceStage({ onCanvas, onMetrics, children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showPortraitHint, setShowPortraitHint] = useState(false);

  useEffect(() => {
    if (canvasRef.current) onCanvas(canvasRef.current);
  }, [onCanvas]);

  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const width = window.innerWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;
      const metrics = computeStageMetrics(width, height, window.devicePixelRatio);
      root.style.setProperty('--stage-scale', String(metrics.scale));
      onMetrics(metrics);
      setShowPortraitHint(isAwkwardLandscape(width, height));
    };

    apply();
    window.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);
    window.visualViewport?.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
      window.visualViewport?.removeEventListener('resize', apply);
    };
  }, [onMetrics]);

  return (
    <>
      <div className="experience-surround" aria-hidden />
      <div className="stage">
        <canvas ref={canvasRef} className="stage-canvas" aria-hidden />
        <div className="overlay">{children}</div>
      </div>
      {showPortraitHint ? <p className="portrait-hint">{COPY.portraitHint}</p> : null}
    </>
  );
}
