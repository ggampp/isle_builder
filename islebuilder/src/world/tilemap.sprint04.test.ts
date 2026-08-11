import { describe, expect, it } from 'vitest';
import { Tilemap } from './tilemap.ts';
import { TerrainLayer } from './layers.ts';

describe('Tilemap paint rules (Sprint 04)', () => {
  it('path exige grama embaixo (não pula camada)', () => {
    const map = new Tilemap();
    map.paintLayer(0, 0, TerrainLayer.Path);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Water);

    map.paintLayer(0, 0, TerrainLayer.Sand);
    map.paintLayer(0, 0, TerrainLayer.Grass);
    map.paintLayer(0, 0, TerrainLayer.Path);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Path);
  });

  it('ponte só sobre água', () => {
    const map = new Tilemap();
    map.paintLayer(0, 0, TerrainLayer.Bridge);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Bridge);

    map.paintLayer(1, 0, TerrainLayer.Sand);
    map.paintLayer(1, 0, TerrainLayer.Bridge);
    expect(map.getLayer(1, 0)).toBe(TerrainLayer.Sand);
  });

  it('penhasco sobre areia ou grama', () => {
    const map = new Tilemap();
    map.paintLayer(0, 0, TerrainLayer.Sand);
    map.paintLayer(0, 0, TerrainLayer.Cliff);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Cliff);

    map.paintLayer(1, 0, TerrainLayer.Sand);
    map.paintLayer(1, 0, TerrainLayer.Grass);
    map.paintLayer(1, 0, TerrainLayer.Cliff);
    expect(map.getLayer(1, 0)).toBe(TerrainLayer.Cliff);
  });

  it('borracha respeita regras especiais de ponte/trilha/penhasco', () => {
    const map = new Tilemap();
    map.setLayer(0, 0, TerrainLayer.Bridge);
    map.eraseLayer(0, 0);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Water);

    map.setLayer(1, 0, TerrainLayer.Path);
    map.eraseLayer(1, 0);
    expect(map.getLayer(1, 0)).toBe(TerrainLayer.Grass);

    map.setLayer(2, 0, TerrainLayer.Cliff);
    map.eraseLayer(2, 0);
    expect(map.getLayer(2, 0)).toBe(TerrainLayer.Grass);
  });
});
