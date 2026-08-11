import { describe, expect, it } from 'vitest';
import { Tilemap } from './tilemap.ts';
import { TerrainLayer } from './layers.ts';
import { computeLandBounds, countIslands } from './landBounds.ts';

describe('landBounds', () => {
  it('returns null when map is empty', () => {
    const tilemap = new Tilemap();
    expect(computeLandBounds(tilemap)).toBeNull();
    expect(countIslands(tilemap)).toBe(0);
  });

  it('computes centroid and counts one island', () => {
    const tilemap = new Tilemap();
    tilemap.setLayer(0, 0, TerrainLayer.Sand);
    tilemap.setLayer(1, 0, TerrainLayer.Sand);
    tilemap.setLayer(0, 1, TerrainLayer.Grass);

    const bounds = computeLandBounds(tilemap);
    expect(bounds).not.toBeNull();
    expect(bounds!.landTileCount).toBe(3);
    expect(bounds!.centroidTileX).toBeCloseTo(0.333, 2);
    expect(countIslands(tilemap)).toBe(1);
  });

  it('counts disconnected islands', () => {
    const tilemap = new Tilemap();
    tilemap.setLayer(0, 0, TerrainLayer.Sand);
    tilemap.setLayer(5, 5, TerrainLayer.Sand);
    expect(countIslands(tilemap)).toBe(2);
  });
});
