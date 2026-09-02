import gsap from 'gsap';
import { ASSET_PATHS } from '../config/assets';
import { DESIGN, PARALLAX_SPEED, REDUCED_TIMING, ROAD_SPEED, TIMING } from '../config/experience';
import type { AssetManifest } from '../config/manifest';
import { SpriteAnimator } from './SpriteAnimator';
import { ParticleSystem } from './ParticleSystem';
import { ParallaxController } from './ParallaxController';
import { EASE } from './easings';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { createSceneState, type SceneName, type World } from '../scenes/sceneTypes';
import { canTransition } from './sceneGraph';
import { drawOpening } from '../scenes/OpeningScene';
import { drawReveal } from '../scenes/RevealScene';
import { drawKey, keyBurstParticles, revealSparkleParticles } from '../scenes/KeyScene';
import { drawDriving } from '../scenes/DrivingScene';
import { drawArrival, drawFlash, drawVignette } from '../scenes/ArrivalScene';

/**
 * Scenes whose entrance animation does not lock interaction.
 *
 * The opening fade and the key's rise are both just entrances onto a control
 * that is already visible and enabled; holding the lock through them would
 * silently swallow an eager tap. The interactions themselves still take the
 * lock — `playKeyActivation` claims it before the unlock runs — so a double tap
 * still cannot start two reveals or two drives.
 */
const NON_BLOCKING_SCENES = new Set<SceneName>(['OPENING', 'KEY', 'COMPLETE']);

export type DirectorEvents = {
  onSceneChange?: (scene: SceneName) => void;
};

/**
 * Owns the state machine, the one active timeline, and the render loop.
 *
 * Every transition goes through `transition()`, which refuses to run while
 * another transition is in flight and refuses any move that is not legal from
 * the current scene. That single choke point is what makes a double tap
 * harmless: the second tap finds the machine already past `OPENING` and is
 * dropped, rather than starting a second cloth animation on top of the first.
 */
export class SceneDirector {
  private renderer: CanvasRenderer;
  private world: World;
  private events: DirectorEvents;

  private scene: SceneName = 'PRELOAD';
  private timeline: gsap.core.Timeline | null = null;
  private transitioning = false;

  private rafId = 0;
  private lastTime = 0;
  private running = false;

  constructor(
    canvas: HTMLCanvasElement,
    manifest: AssetManifest,
    images: Map<string, HTMLImageElement>,
    reduced: boolean,
    events: DirectorEvents = {},
  ) {
    this.renderer = new CanvasRenderer(canvas);
    this.events = events;

    const scratch = document.createElement('canvas');
    scratch.width = 512;
    scratch.height = 512;

    this.world = {
      manifest,
      images,
      reduced,
      state: createSceneState(),
      anim: {
        male: new SpriteAnimator(manifest.spriteSheets.maleIdle, { mode: 'pingpong', fps: 6 }),
        panda: new SpriteAnimator(manifest.spriteSheets.pandaRevealCheer, { mode: 'once' }).setFrame(0),
        duck: new SpriteAnimator(manifest.spriteSheets.duckRevealCheer, { mode: 'once' }).setFrame(0),
        cover: new SpriteAnimator(manifest.spriteSheets.redCoverReveal, { mode: 'once' }).setFrame(0),
        driver: new SpriteAnimator(manifest.spriteSheets.womanDriver, { mode: 'pingpong', fps: 6 }),
        walk: new SpriteAnimator(manifest.spriteSheets.womanWalk, { mode: 'loop', fps: 8 }),
      },
      particles: new ParticleSystem(manifest.spriteSheets.keyFx, 120),
      parallax: new ParallaxController([
        { key: 'far', relativeSpeed: PARALLAX_SPEED.far, width: DESIGN.width },
        { key: 'mid', relativeSpeed: PARALLAX_SPEED.mid, width: DESIGN.width },
        { key: 'road', relativeSpeed: PARALLAX_SPEED.road, width: DESIGN.width },
      ]),
      scratch,
    };
  }

  get currentScene(): SceneName {
    return this.scene;
  }

  get isTransitioning(): boolean {
    return this.transitioning;
  }

  canTransitionTo(next: SceneName): boolean {
    return !this.transitioning && canTransition(this.scene, next);
  }

  resize(metrics: Parameters<CanvasRenderer['resize']>[0]): void {
    this.renderer.resize(metrics);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  /** Called when the tab is hidden or shown; prevents a large catch-up step. */
  setPaused(paused: boolean): void {
    if (paused) {
      this.timeline?.pause();
      this.stop();
    } else {
      this.lastTime = performance.now();
      this.timeline?.resume();
      this.start();
    }
  }

  dispose(): void {
    this.stop();
    this.timeline?.kill();
    this.timeline = null;
    gsap.killTweensOf(this.world.state);
    this.world.particles.clear();
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    const delta = Math.min(now - this.lastTime, 120);
    this.lastTime = now;

    this.update(delta);
    this.render();

    this.rafId = requestAnimationFrame(this.tick);
  };

  private update(delta: number): void {
    const { anim, particles, parallax, state } = this.world;

    // Read-only probe for the smoke test: it needs to prove the world is
    // actually scrolling, which nothing in the DOM otherwise reveals.
    (window as unknown as { __firstDriveRoadOffset?: number }).__firstDriveRoadOffset =
      parallax.offsetOf('road');

    switch (this.scene) {
      case 'OPENING':
        anim.male.update(delta);
        break;
      case 'REVEAL':
      case 'KEY':
        anim.male.update(delta);
        anim.cover.update(delta);
        anim.panda.update(delta);
        anim.duck.update(delta);
        break;
      case 'DRIVING':
        // Keep the driver static in the side-view shot: the supplied composition
        // reads as a still portrait inside the car rather than a looping idle.
        anim.driver.setFrame(0);
        parallax.update(delta);
        break;
      case 'ARRIVAL':
      case 'COMPLETE':
        anim.walk.update(delta);
        anim.panda.update(delta);
        anim.duck.update(delta);
        parallax.update(delta);
        this.emitStationAmbience(delta);
        break;
      default:
        break;
    }

    // The suspension bob is derived from time rather than tweened, so it stays
    // in step however long the drive runs.
    if (this.scene === 'DRIVING' && !this.world.reduced) {
      state.carBob = Math.sin(performance.now() / 240) * 6;
    }

    particles.update(delta);
  }

  /** Time since the last finale particle, in ms. */
  private ambienceTimer = 0;

  /**
   * A slow drift of hearts, stars and petals across the finale.
   *
   * Topped up a few at a time rather than fired as one burst, so the last
   * screen keeps moving gently for as long as it is on display without ever
   * building into a confetti storm — the pool caps it regardless.
   */
  private emitStationAmbience(delta: number): void {
    const { state, particles, reduced } = this.world;
    if (reduced || state.arrivalAlpha < 0.6) return;

    this.ambienceTimer += delta;
    if (this.ambienceTimer < 120) return;
    this.ambienceTimer = 0;

    // Frames 6-10 of the key sheet: sparkles, stars, hearts and petals.
    const FRAMES = [9, 7, 10, 6, 9, 7];
    const frame = FRAMES[Math.floor(Math.random() * FRAMES.length)];

    const spawnFromTop = Math.random() < 0.5;
    if (spawnFromTop) {
      const x = 120 + Math.random() * 700;
      particles.spawn({
        frame,
        x,
        y: 70 + Math.random() * 140,
        size: 150 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 26,
        vy: 42 + Math.random() * 38,
        gravity: 18 + Math.random() * 14,
        lifetime: 3.2 + Math.random() * 1.4,
        spin: (Math.random() - 0.5) * 1.1,
        fadeIn: 0.12,
      });
    }

    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? 120 + Math.random() * 300 : 520 + Math.random() * 300;
    const burstCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < burstCount; i++) {
      particles.spawn({
        frame,
        x: x + (Math.random() - 0.5) * 70,
        y: 1550 + Math.random() * 110,
        size: 130 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 60,
        vy: -90 - Math.random() * 70,
        gravity: 18 + Math.random() * 14,
        lifetime: 2.6 + Math.random() * 1.4,
        spin: (Math.random() - 0.5) * 0.9,
        fadeIn: 0.18,
      });
    }
  }

  private render(): void {
    const { ctx } = this.renderer;
    const { world } = this;
    const image = world.images.get(ASSET_PATHS.sprites.keyFx);

    this.renderer.clear('#0b1026');

    switch (this.scene) {
      case 'PRELOAD':
      case 'OPENING':
        drawOpening(ctx, world);
        break;
      case 'REVEAL':
        drawReveal(ctx, world);
        break;
      case 'KEY':
        drawReveal(ctx, world);
        drawKey(ctx, world);
        break;
      case 'DRIVING':
        drawDriving(ctx, world);
        break;
      case 'ARRIVAL':
      case 'COMPLETE':
        drawArrival(ctx, world);
        break;
    }

    if (image) world.particles.draw(ctx, image);
    drawVignette(ctx, world);
    drawFlash(ctx, world);
  }

  /**
   * The only way the scene changes.
   *
   * Returns false when the move is illegal or another transition is already
   * running, so callers can treat a rejected tap as a no-op rather than having
   * to track interaction locks themselves.
   *
   * `onSettled` fires when this scene's own timeline finishes. Chain the next
   * scene through it rather than through a timer of the same length: a timer
   * racing the timeline it is timing loses often enough to matter, and a
   * refused transition is not retried — the experience simply stops.
   */
  transition(next: SceneName, onSettled?: () => void): boolean {
    if (!this.canTransitionTo(next)) return false;

    this.transitioning = true;
    this.timeline?.kill();

    const timeline = gsap.timeline({
      onComplete: () => {
        // Clear the lock *before* handing over, so a caller chaining the next
        // scene here is not refused by the lock this timeline just released.
        this.transitioning = false;
        onSettled?.();
      },
    });
    this.timeline = timeline;

    switch (next) {
      case 'OPENING':
        this.buildOpening(timeline);
        break;
      case 'REVEAL':
        this.buildReveal(timeline);
        break;
      case 'KEY':
        this.buildKey(timeline);
        break;
      case 'DRIVING':
        this.buildDriving(timeline);
        break;
      case 'ARRIVAL':
        this.buildArrival(timeline);
        break;
      case 'COMPLETE':
        this.transitioning = false;
        onSettled?.();
        break;
      default:
        break;
    }

    // The opening is only an entrance fade — there is nothing to protect, and
    // holding the lock for its duration would silently swallow an eager first
    // tap on a CTA that is already enabled and on screen.
    if (NON_BLOCKING_SCENES.has(next)) this.transitioning = false;

    this.setScene(next);
    return true;
  }

  private setScene(next: SceneName): void {
    this.scene = next;
    this.events.onSceneChange?.(next);
  }

  // ---------------------------------------------------------------- opening

  private buildOpening(timeline: gsap.core.Timeline): void {
    const { state, anim } = this.world;
    const duration = this.world.reduced
      ? REDUCED_TIMING.openingFadeIn
      : TIMING.openingFadeIn;

    anim.male.play({ mode: 'pingpong', fps: 6 });
    anim.cover.setFrame(0);

    timeline.to(state, { openingAlpha: 1, duration, ease: EASE.fade }, 0);
  }

  // ----------------------------------------------------------------- reveal

  private buildReveal(timeline: gsap.core.Timeline): void {
    const { state, anim } = this.world;
    const reduced = this.world.reduced;

    state.carAlpha = 1;

    if (reduced) {
      // Same beat, no frame-heavy hauling: the cloth simply lifts away.
      anim.panda.setFrame(6);
      anim.duck.setFrame(6);
      anim.cover.setFrame(7);
      timeline
        .to(state, { maleAlpha: 0, duration: 0.3, ease: EASE.fade }, 0)
        .to(state, { pandaAlpha: 1, duckAlpha: 1, duration: 0.3, ease: EASE.fade }, 0)
        .to(state, { coverAlpha: 0, duration: REDUCED_TIMING.reveal.total, ease: EASE.fade }, 0)
        .add(() => revealSparkleParticles(this.world), 0.4);
      return;
    }

    const t = TIMING.reveal;

    // He steps away as the mascots arrive: the manifest's reveal layer order
    // omits him, and the approved reveal screen has no one at the gate.
    timeline.to(state, { maleAlpha: 0, duration: 0.55, ease: EASE.fade }, 0.1);

    // Mascots arrive at their marks, feet planted by their [0.5, 1] anchors.
    state.pandaOffsetX = -70;
    state.duckOffsetX = 70;
    timeline
      .to(state, { pandaAlpha: 1, pandaOffsetX: 0, duration: t.mascotsIn, ease: EASE.arrive }, 0)
      .to(state, { duckAlpha: 1, duckOffsetX: 0, duration: t.mascotsIn, ease: EASE.arrive }, 0.08);

    // Grip, then brace, then haul. The frames do the work; the whole-body
    // offset is only a few pixels of follow-through.
    timeline.add(() => {
      anim.panda.setFrame(1);
      anim.duck.setFrame(1);
    }, t.gripAt);

    timeline.add(() => {
      anim.panda.play({ from: 2, to: 4, mode: 'once', fps: 5 });
      anim.duck.play({ from: 2, to: 4, mode: 'once', fps: 5 });
    }, t.pullAt);

    timeline
      .to(state, { pandaOffsetX: -26, duration: 0.5, ease: EASE.smooth }, t.pullAt)
      .to(state, { duckOffsetX: 26, duration: 0.5, ease: EASE.smooth }, t.pullAt)
      .to(state, { pandaOffsetX: 0, duration: 0.45, ease: EASE.smooth }, t.releaseAt)
      .to(state, { duckOffsetX: 0, duration: 0.45, ease: EASE.smooth }, t.releaseAt);

    // The cloth itself: eight frames across the reveal window.
    timeline.add(() => {
      anim.cover.play({ from: 0, to: 7, mode: 'once', fps: 7 });
    }, t.clothStart);

    timeline.to(
      state,
      { coverAlpha: 0, duration: 0.32, ease: EASE.fade },
      t.clothEnd - 0.2,
    );

    // Celebration once they let go.
    timeline.add(() => {
      anim.panda.play({ from: 5, to: 7, mode: 'once', fps: 6 });
      anim.duck.play({ from: 5, to: 7, mode: 'once', fps: 6 });
      revealSparkleParticles(this.world);
    }, t.releaseAt);

    // A beat to actually look at the car before the key arrives.
    timeline.to(state, { duration: t.settle }, t.celebrateEnd);
  }

  // -------------------------------------------------------------------- key

  private buildKey(timeline: gsap.core.Timeline): void {
    const { state } = this.world;
    const duration = this.world.reduced ? REDUCED_TIMING.key.total : TIMING.key.riseIn;

    state.keyPose = 1;
    state.keyScale = 0.6;

    timeline
      .to(state, { keyAlpha: 1, keyScale: 1, duration, ease: EASE.arrive }, 0)
      .to(state, { keyRingAlpha: 0.5, keyRingScale: 1, duration, ease: EASE.fade }, 0);

    if (!this.world.reduced) {
      // Idle float and a barely-there rotation, started once the key has landed.
      timeline.add(() => {
        gsap.to(state, {
          keyFloat: -14,
          duration: 1.9,
          ease: EASE.breathe,
          yoyo: true,
          repeat: -1,
        });
        gsap.to(state, {
          keyRotation: 3.5,
          duration: 2.6,
          ease: EASE.breathe,
          yoyo: true,
          repeat: -1,
        });
      }, duration);
    }
  }

  /**
   * The key being used. Separate from `transition` because it is an
   * interaction, not a scene change: it runs its own timeline and only then
   * asks the machine to move on.
   */
  playKeyActivation(onDone: () => void): boolean {
    if (this.scene !== 'KEY' || this.transitioning) return false;
    this.transitioning = true;

    const { state } = this.world;
    gsap.killTweensOf(state, 'keyFloat,keyRotation');

    const t = TIMING.key;
    const reduced = this.world.reduced;
    const timeline = gsap.timeline({
      onComplete: () => {
        this.transitioning = false;
        onDone();
      },
    });
    this.timeline?.kill();
    this.timeline = timeline;

    if (reduced) {
      timeline
        .add(() => {
          state.keyPose = 2;
        }, 0)
        .to(state, { keyBurstAlpha: 0.8, keyBurstScale: 1, duration: 0.25, ease: EASE.fade }, 0)
        .to(state, { whiteFlash: 1, duration: REDUCED_TIMING.key.total, ease: EASE.fade }, 0.15);
      return true;
    }

    timeline
      .add(() => {
        state.keyPose = 2;
      }, 0)
      .to(state, { keyScale: 0.9, duration: t.pressed, ease: EASE.settle }, 0)
      .add(() => {
        state.keyPose = 3;
      }, t.pressed)
      .to(state, { keyRotation: 22, keyScale: 1.05, duration: t.rotate, ease: EASE.smooth }, t.pressed)
      .add(() => {
        keyBurstParticles(this.world);
      }, t.pressed + t.rotate * 0.4)
      .to(
        state,
        { keyBurstAlpha: 1, keyBurstScale: 1.35, duration: t.burst, ease: EASE.fade },
        t.pressed + t.rotate * 0.4,
      )
      .to(
        state,
        { keyRingAlpha: 1, keyRingScale: 1.6, duration: t.burst, ease: EASE.settle },
        t.pressed + t.rotate * 0.4,
      )
      .to(state, { keyAlpha: 0, duration: 0.3, ease: EASE.fade }, t.pressed + t.rotate + 0.18)
      .to(state, { keyBurstAlpha: 0, keyRingAlpha: 0, duration: 0.3, ease: EASE.fade }, '>-0.1')
      .to(state, { whiteFlash: 1, duration: t.whiteOut, ease: EASE.fade }, t.pressed + t.rotate + 0.1);

    return true;
  }

  // ---------------------------------------------------------------- driving

  private buildDriving(timeline: gsap.core.Timeline): void {
    const { state, anim, parallax } = this.world;
    const reduced = this.world.reduced;

    state.wheelSpinning = !reduced;
    state.keyAlpha = 0;
    state.keyBurstAlpha = 0;
    state.keyRingAlpha = 0;
    anim.driver.setFrame(0);
    parallax.setSpeed(reduced ? 0 : ROAD_SPEED);

    const fade = reduced ? 0.3 : TIMING.driving.fadeIn;

    timeline
      .to(state, { drivingAlpha: 1, duration: fade, ease: EASE.fade }, 0)
      .to(state, { whiteFlash: 0, duration: fade, ease: EASE.fade }, 0)
      .to(state, { destinationAlpha: 1, duration: 0.5, ease: EASE.fade }, fade * 0.6);
  }

  /** Eases the drive to a halt; resolves once the car has stopped. */
  decelerate(onStopped: () => void): void {
    const { state, parallax } = this.world;
    const reduced = this.world.reduced;
    const duration = reduced ? 0.4 : TIMING.driving.decelerate;

    const speed = { value: parallax.currentSpeed };
    gsap.to(speed, {
      value: 0,
      duration,
      ease: EASE.settle,
      onUpdate: () => parallax.setSpeed(speed.value),
      onComplete: () => {
        state.wheelSpinning = false;
        state.carBob = 0;
        onStopped();
      },
    });
  }

  // ---------------------------------------------------------------- arrival

  private buildArrival(timeline: gsap.core.Timeline): void {
    const { state, anim } = this.world;
    const reduced = this.world.reduced;
    const t = TIMING.arrival;

    anim.walk.setFrame(0);
    // A slow wave between the two cheer frames, rather than a held pose.
    anim.panda.play({ from: 6, to: 7, mode: reduced ? 'once' : 'pingpong', fps: 3 });
    anim.duck.play({ from: 6, to: 7, mode: reduced ? 'once' : 'pingpong', fps: 3 });
    state.pandaOffsetY = 0;
    state.duckOffsetY = 0;
    state.womanX = reduced ? 0 : -120;
    state.womanY = reduced ? 0 : 40;
    state.stationCarX = reduced ? 0 : -40;

    const fade = reduced ? REDUCED_TIMING.arrival.total : t.crossFade;

    timeline
      .to(state, { arrivalAlpha: 1, duration: fade, ease: EASE.fade }, 0)
      .to(state, { drivingAlpha: 0, duration: fade, ease: EASE.fade }, 0)
      .to(state, { stationCarX: 0, duration: reduced ? 0.01 : 1.1, ease: EASE.settle }, 0)
      .to(state, { womanAlpha: 1, duration: reduced ? 0.3 : 0.7, ease: EASE.fade }, fade * 0.5)
      .to(
        state,
        { mascotFinaleAlpha: 1, duration: reduced ? 0.3 : 0.8, ease: EASE.arrive },
        fade * 0.7,
      )
      .to(
        state,
        { womanX: 0, womanY: 0, duration: reduced ? 0.01 : t.walk, ease: 'none' },
        fade * 0.5,
      )
      .add(() => {
        // Motion stops once she has arrived; the final composition stays static.
        if (!reduced) anim.walk.setFrame(0);
      });
  }

  // ----------------------------------------------------------------- replay

  /**
   * Returns everything to the opening state: timelines killed, tweens on the
   * state object cancelled, sprite frames rewound, parallax zeroed, particles
   * released. Nothing survives a replay except the decoded images.
   */
  replay(): void {
    this.timeline?.kill();
    this.timeline = null;
    gsap.killTweensOf(this.world.state);
    this.transitioning = false;

    Object.assign(this.world.state, createSceneState());

    const { anim, particles, parallax } = this.world;
    anim.male.play({ mode: 'pingpong', fps: 6 });
    anim.panda.setFrame(0);
    anim.duck.setFrame(0);
    anim.cover.setFrame(0);
    anim.driver.setFrame(0);
    anim.walk.setFrame(0);

    particles.clear();
    parallax.reset();
    this.ambienceTimer = 0;

    this.scene = 'PRELOAD';
    this.transition('OPENING');
  }
}
