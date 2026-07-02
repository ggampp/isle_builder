import { describe, expect, it } from 'vitest';
import { bresenhamLine } from './line.ts';
import { filledRectTiles } from './rect.ts';
import { floodFill, BUCKET_MAX_FILL_CELLS } from './bucket.ts';
import { Tilemap } from '../world/tilemap.ts';
import { TerrainLayer } from '../world/layers.ts';
import { TILE_SIZE } from '../world/constants.ts';
import { LineTool } from './line.ts';
import { RectTool } from './rect.ts';

describe('bresenhamLine', () => {
  it('ponto único quando origem e destino coincidem', () => {
    expect(bresenhamLine(3, 5, 3, 5)).toEqual([{ x: 3, y: 5 }]);
  });

  it('linha horizontal de 5 tiles', () => {
    const pts = bresenhamLine(0, 0, 4, 0);
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[4]).toEqual({ x: 4, y: 0 });
  });

  it('linha diagonal perfeita', () => {
    const pts = bresenhamLine(0, 0, 3, 3);
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]);
  });
});

describe('filledRectTiles', () => {
  it('retângulo 3×2 inclusivo', () => {
    const tiles = filledRectTiles(1, 1, 3, 2, TerrainLayer.Sand);
    expect(tiles).toHaveLength(6);
    expect(tiles.every((t) => t.layer === TerrainLayer.Sand)).toBe(true);
    expect(tiles.some((t) => t.x === 1 && t.y === 1)).toBe(true);
    expect(tiles.some((t) => t.x === 3 && t.y === 2)).toBe(true);
  });

  it('funciona com cantos invertidos', () => {
    const a = filledRectTiles(0, 0, 2, 2, 1);
    const b = filledRectTiles(2, 2, 0, 0, 1);
    expect(a.length).toBe(b.length);
  });
});

describe('floodFill', () => {
  it('preenche região contígua da mesma camada', () => {
    const map = new Tilemap();
    map.setLayer(0, 0, TerrainLayer.Water);
    map.setLayer(1, 0, TerrainLayer.Water);
    map.setLayer(2, 0, TerrainLayer.Sand);

    floodFill(map, 0, 0, TerrainLayer.Sand);

    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Sand);
    expect(map.getLayer(1, 0)).toBe(TerrainLayer.Sand);
    expect(map.getLayer(2, 0)).toBe(TerrainLayer.Sand);
  });

  it('não atravessa camada diferente', () => {
    const map = new Tilemap();
    map.setLayer(0, 0, TerrainLayer.Water);
    map.setLayer(1, 0, TerrainLayer.Sand);

    floodFill(map, 0, 0, TerrainLayer.Sand);

    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Sand);
    expect(map.getLayer(1, 0)).toBe(TerrainLayer.Sand);
  });

  it('respeita regra de elevação (+1 por vez)', () => {
    const map = new Tilemap();
    map.setLayer(0, 0, TerrainLayer.Water);

    const result = floodFill(map, 0, 0, TerrainLayer.Grass);
    expect(result.cellsFilled).toBe(0);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Water);
  });

  it('reporta hitLimit quando excede o teto', () => {
    const map = new Tilemap();
    for (let x = 0; x < 20; x++) {
      map.setLayer(x, 0, TerrainLayer.Water);
    }

    const result = floodFill(map, 0, 0, TerrainLayer.Sand, 5);
    expect(result.cellsFilled).toBe(5);
    expect(result.hitLimit).toBe(true);
    expect(map.getLayer(5, 0)).toBe(TerrainLayer.Water);
  });
});

describe('LineTool preview vs commit', () => {
  it('onDrag não altera o mapa; onUp pinta', () => {
    const map = new Tilemap();
    const line = new LineTool(map);
    line.setRadius(1);

    line.onDown(0, 0, TerrainLayer.Sand);
    line.onDrag(3 * TILE_SIZE, 0, TerrainLayer.Sand);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Water);

    line.onUp(3 * TILE_SIZE, 0, TerrainLayer.Sand);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Sand);
    expect(map.getLayer(3, 0)).toBe(TerrainLayer.Sand);
  });
});

describe('RectTool preview vs commit', () => {
  it('onDrag não altera o mapa; onUp preenche retângulo', () => {
    const map = new Tilemap();
    const rect = new RectTool(map);

    rect.onDown(0, 0, TerrainLayer.Sand);
    rect.onDrag(2 * TILE_SIZE, 2 * TILE_SIZE, TerrainLayer.Sand);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Water);

    rect.onUp(2 * TILE_SIZE, 2 * TILE_SIZE, TerrainLayer.Sand);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Sand);
    expect(map.getLayer(2, 2)).toBe(TerrainLayer.Sand);
    expect(map.getLayer(3, 0)).toBe(TerrainLayer.Water);
  });
});

describe('BUCKET_MAX_FILL_CELLS', () => {
  it('mantém teto de 10k documentado', () => {
    expect(BUCKET_MAX_FILL_CELLS).toBe(10000);
  });
});
