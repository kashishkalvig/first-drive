import { describe, expect, it } from 'vitest';
import { ASSET_BASE_URL, ASSET_PATHS, assetUrl, ALL_IMAGE_PATHS } from '../config/assets';

describe('asset URL resolver', () => {
  it('joins the base and a relative path with exactly one slash', () => {
    expect(assetUrl('sprites/key_fx_3x4_portrait.png')).toBe(
      `${ASSET_BASE_URL}/sprites/key_fx_3x4_portrait.png`,
    );
  });

  it('tolerates a leading slash on the relative path', () => {
    expect(assetUrl('/overlays/cinematic_vignette_portrait.png')).toBe(
      `${ASSET_BASE_URL}/overlays/cinematic_vignette_portrait.png`,
    );
  });

  it('never leaves a trailing slash on the base', () => {
    expect(ASSET_BASE_URL.endsWith('/')).toBe(false);
  });

  it('produces a browser path, never a filesystem path', () => {
    for (const path of ALL_IMAGE_PATHS) {
      const url = assetUrl(path);
      expect(url).not.toMatch(/^[A-Za-z]:\\/);
      expect(url).not.toContain('\\');
      expect(url).not.toContain('../');
      expect(url.startsWith('/') || url.startsWith('http')).toBe(true);
    }
  });

  it('registers every sheet the manifest names', () => {
    const registered = Object.values(ASSET_PATHS.sprites);
    expect(registered).toHaveLength(9);
    expect(new Set(registered).size).toBe(9);
  });
});
