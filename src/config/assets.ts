/**
 * The one place any asset path is written down.
 *
 * Everything the experience loads is resolved through `assetUrl()` against a
 * single configurable root, so the pack can move (a CDN, a sub-path deploy)
 * without touching a scene file. Nothing outside this module contains a
 * filename, and nothing anywhere contains a local filesystem path.
 */

const configuredAssetBase = import.meta.env.VITE_ASSET_BASE_URL?.trim();

export const ASSET_BASE_URL = (
  configuredAssetBase || `${import.meta.env.BASE_URL}assets/first-drive`
).replace(/\/+$/, '');

export const ASSET_PATHS = {
  backgrounds: {
    opening: 'backgrounds/gate_dawn_portrait.png',
    drivingFar: 'backgrounds/driving_far_portrait.png',
    drivingMid: 'backgrounds/driving_midground_portrait.png',
    drivingRoad: 'backgrounds/driving_foreground_road_portrait.png',
    parked: 'backgrounds/parked-car-screen.jpeg',
    station: 'backgrounds/craigieburn_station_portrait.png',
  },
  sprites: {
    maleIdle: 'sprites/male_idle_2x3_portrait.png',
    pandaReveal: 'sprites/panda_reveal_cheer_2x4_portrait.png',
    duckReveal: 'sprites/duck_reveal_cheer_2x4_portrait.png',
    redCover: 'sprites/red_cover_reveal_2x4_portrait.png',
    silverCar: 'sprites/silver_liftback_2x3_portrait.png',
    keyFx: 'sprites/key_fx_3x4_portrait.png',
    womanDriver: 'sprites/woman_driver_2x3_portrait.png',
    womanWalk: 'sprites/woman_walk_2x4_portrait.png',
    contactShadows: 'sprites/contact_shadows_2x3_portrait.png',
  },
  overlays: {
    vignette: 'overlays/cinematic_vignette_portrait.png',
    driverWindowMask: 'overlays/side_window_driver_clip.png',
  },
  data: {
    manifest: 'asset-manifest.json',
    alphaValidation: 'alpha-validation.json',
  },
} as const;

export function assetUrl(relativePath: string): string {
  return `${ASSET_BASE_URL}/${relativePath.replace(/^\/+/, '')}`;
}

/** Images needed before the opening screen may be shown. */
export const CRITICAL_IMAGE_PATHS: readonly string[] = [
  ASSET_PATHS.backgrounds.opening,
  ASSET_PATHS.sprites.maleIdle,
  ASSET_PATHS.sprites.silverCar,
  ASSET_PATHS.sprites.redCover,
  ASSET_PATHS.sprites.pandaReveal,
  ASSET_PATHS.sprites.duckReveal,
  ASSET_PATHS.sprites.keyFx,
  ASSET_PATHS.sprites.contactShadows,
  ASSET_PATHS.overlays.vignette,
];

/** Fetched in the background once the opening is interactive. */
export const DEFERRED_IMAGE_PATHS: readonly string[] = [
  ASSET_PATHS.backgrounds.drivingFar,
  ASSET_PATHS.backgrounds.drivingMid,
  ASSET_PATHS.backgrounds.drivingRoad,
  ASSET_PATHS.backgrounds.parked,
  ASSET_PATHS.backgrounds.station,
  ASSET_PATHS.sprites.womanDriver,
  ASSET_PATHS.sprites.womanWalk,
  ASSET_PATHS.overlays.driverWindowMask,
];

export const ALL_IMAGE_PATHS: readonly string[] = [
  ...CRITICAL_IMAGE_PATHS,
  ...DEFERRED_IMAGE_PATHS,
];
