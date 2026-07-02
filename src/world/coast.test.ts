import { describe, expect, it } from 'vitest';
import { Tilemap } from './tilemap.ts';
import { TerrainLayer } from './layers.ts';
import {
  CoastManager,
  cellHash01,
  computeDistanceField,
  getCoastTileInfo,
} from './coast.ts';

// Re-export pickDecoration for testing via a test helper
function decorationAt(map: Tilemap, x: number, y: number): number {
  const field = computeDistanceField(map, x - 10, y - 10, x + 10, y + 10);
  const dist = field.get(`${x},${y}`) ?? 99;
  return getCoastTileInfo(x, y, dist, map).decoration;
}

describe('coast', () => {
  it('cellHash01 é determinístico por posição', () => {
    expect(cellHash01(5, 10)).toBe(cellHash01(5, 10));
    expect(cellHash01(5, 10)).not.toBe(cellHash01(5, 11));
  });

  it('distância à terra é 0 em tile de areia e > 0 na água adjacente', () => {
    const map = new Tilemap();
    map.setLayer(0, 0, TerrainLayer.Sand);

    const field = computeDistanceField(map, -2, -2, 4, 4);
    expect(field.get('0,0')).toBe(0);
    expect(field.get('1,0')!).toBeGreaterThan(0);
    expect(field.get('1,0')!).toBeLessThanOrEqual(2);
  });

  it('decoração não muda em tiles não editados após undo', () => {
    const map = new Tilemap();
    map.setLayer(5, 5, TerrainLayer.Sand);

    const before = decorationAt(map, 6, 5);

    map.setLayer(20, 20, TerrainLayer.Sand);
    map.setLayer(20, 20, TerrainLayer.Water);

    const after = decorationAt(map, 6, 5);
    expect(after).toBe(before);
  });

  it('CoastManager marca chunks sujos ao editar terra', () => {
    const map = new Tilemap();
    const coast = new CoastManager(map);
    map.setLayer(0, 0, TerrainLayer.Sand);
    coast.onTileChanged(0, 0, TerrainLayer.Water, TerrainLayer.Sand);
    const dirty = coast.consumeDirtyChunks();
    expect(dirty.length).toBeGreaterThan(0);
  });

  it('ponte não gera água rasa', () => {
    const map = new Tilemap();
    map.setLayer(0, 0, TerrainLayer.Sand);
    map.setLayer(2, 0, TerrainLayer.Bridge);

    const info = getCoastTileInfo(2, 0, 1, map);
    expect(info.isShallow).toBe(false);
  });
});
