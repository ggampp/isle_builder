import { describe, expect, it } from 'vitest';
import { Tilemap } from './tilemap.ts';
import { TerrainLayer } from './layers.ts';

describe('Tilemap', () => {
  it('tile não pintado é água por padrão', () => {
    const map = new Tilemap();
    expect(map.getLayer(5, 5)).toBe(TerrainLayer.Water);
  });

  it('guarda e recupera camadas através de fronteiras de chunk, incluindo coordenadas negativas', () => {
    const map = new Tilemap();
    map.setLayer(-1, -1, TerrainLayer.Sand);
    map.setLayer(100, 100, TerrainLayer.Grass);

    expect(map.getLayer(-1, -1)).toBe(TerrainLayer.Sand);
    expect(map.getLayer(100, 100)).toBe(TerrainLayer.Grass);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Water);
  });

  it('paintLayer bloqueia pular uma camada ao subir (grama não pega direto na água)', () => {
    const map = new Tilemap();
    map.paintLayer(0, 0, TerrainLayer.Grass);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Water);
  });

  it('paintLayer permite subir uma camada de cada vez', () => {
    const map = new Tilemap();
    map.paintLayer(0, 0, TerrainLayer.Sand);
    map.paintLayer(0, 0, TerrainLayer.Grass);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Grass);
  });

  it('paintLayer sempre permite descer direto (pintar água limpa o tile)', () => {
    const map = new Tilemap();
    map.setLayer(0, 0, TerrainLayer.Grass);
    map.paintLayer(0, 0, TerrainLayer.Water);
    expect(map.getLayer(0, 0)).toBe(TerrainLayer.Water);
  });

  it('setLayer marca o chunk como sujo; dirtyChunks() lista só os sujos', () => {
    const map = new Tilemap();
    map.setLayer(0, 0, TerrainLayer.Sand);
    map.setLayer(200, 200, TerrainLayer.Sand);

    const dirty = [...map.dirtyChunks()];
    expect(dirty).toHaveLength(2);

    for (const chunk of dirty) chunk.dirty = false;
    expect([...map.dirtyChunks()]).toHaveLength(0);
  });

  it('editar um tile na borda de um chunk também suja o chunk vizinho (afeta a mask dele)', () => {
    const map = new Tilemap();
    // CHUNK_SIZE=32: tile (31, 5) é a última coluna do chunk (0,0), vizinho
    // direto de (32, 5), primeira coluna do chunk (1,0).
    map.setLayer(32, 5, TerrainLayer.Sand);
    for (const chunk of map.dirtyChunks()) chunk.dirty = false;

    map.setLayer(31, 5, TerrainLayer.Sand);

    const dirtyKeys = [...map.dirtyChunks()].map((c) => `${c.cx},${c.cy}`);
    expect(dirtyKeys).toContain('0,0');
    expect(dirtyKeys).toContain('1,0');
  });

  it('setLayer não mexe em nada (nem suja o chunk) se o valor já é o mesmo', () => {
    const map = new Tilemap();
    map.setLayer(0, 0, TerrainLayer.Sand);
    for (const chunk of map.dirtyChunks()) chunk.dirty = false;

    map.setLayer(0, 0, TerrainLayer.Sand);
    expect([...map.dirtyChunks()]).toHaveLength(0);
  });
});
