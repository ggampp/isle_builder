/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import { trackIconUrl, buildingIconUrl, toolIconUrl } from './buildIcons.ts';
import { PIECE_KINDS } from '../rail/geometry.ts';
import { BUILDING_KINDS } from '../world/buildings.ts';

describe('buildIcons', () => {
  it('renders an SVG data-URL for every track piece', () => {
    for (const kind of PIECE_KINDS) {
      const url = trackIconUrl(kind);
      expect(url.startsWith('data:image/svg+xml')).toBe(true);
      expect(url.length).toBeGreaterThan(80);
    }
  });

  it('renders an SVG data-URL for every building', () => {
    for (const kind of BUILDING_KINDS) {
      const url = buildingIconUrl(kind);
      expect(url.startsWith('data:image/svg+xml')).toBe(true);
    }
  });

  it('renders tool icons for siding and dynamite', () => {
    expect(toolIconUrl('siding').startsWith('data:image/svg+xml')).toBe(true);
    expect(toolIconUrl('dynamite').startsWith('data:image/svg+xml')).toBe(true);
  });

  it('returns stable URLs for repeated lookups', () => {
    expect(buildingIconUrl('house')).toBe(buildingIconUrl('house'));
  });
});
