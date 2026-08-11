import * as THREE from 'three';
import { CHUNK_SIZE, TILE_SIZE } from '../world/constants.ts';
import type { Chunk, Tilemap } from '../world/tilemap.ts';
import { computeBlobMask, sampleNeighbors } from '../world/autotiler.ts';
import { TerrainLayer } from '../world/layers.ts';
import { ATLAS_GRID_COLS, ATLAS_GRID_ROWS } from './placeholderAtlas.ts';

/** Decide se um tile entra no mesh desta camada de render. */
function shouldRenderTile(layer: number, targetLayer: number): boolean {
  switch (targetLayer) {
    case TerrainLayer.Sand:
      return layer === TerrainLayer.Sand;
    case TerrainLayer.Grass:
      return layer >= TerrainLayer.Grass && layer !== TerrainLayer.Bridge;
    case TerrainLayer.Path:
      return layer === TerrainLayer.Path;
    case TerrainLayer.Bridge:
      return layer === TerrainLayer.Bridge;
    case TerrainLayer.Cliff:
      return layer === TerrainLayer.Cliff;
    default:
      return layer >= targetLayer;
  }
}

/**
 * Monta a geometria de um chunk para uma única camada (ex.: só os tiles
 * com `layer >= threshold`), um quad UV-mapeado no atlas blob por tile.
 * Retorna `null` se nenhum tile do chunk atinge essa camada (chunk vazio
 * para essa camada não precisa de mesh).
 *
 * Convenção de UV (ver render/placeholderAtlas.ts): mundo Norte (+Y) fica
 * no topo do atlas (v pequeno), Sul (-Y) embaixo (v grande) — resultado do
 * `flipY` padrão do THREE.CanvasTexture combinado com o canvas ter y
 * crescendo para baixo.
 */
export function buildLayerGeometry(tilemap: Tilemap, chunk: Chunk, threshold: number): THREE.BufferGeometry | null {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let quadCount = 0;

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const layer = chunk.layers[ly * CHUNK_SIZE + lx];
      if (!shouldRenderTile(layer, threshold)) continue;

      const tileX = chunk.cx * CHUNK_SIZE + lx;
      const tileY = chunk.cy * CHUNK_SIZE + ly;
      const mask = computeBlobMask(sampleNeighbors(tilemap, tileX, tileY, threshold));
      const col = mask % ATLAS_GRID_COLS;
      const row = Math.floor(mask / ATLAS_GRID_COLS);
      const u0 = col / ATLAS_GRID_COLS;
      const u1 = (col + 1) / ATLAS_GRID_COLS;
      const v0 = row / ATLAS_GRID_ROWS;
      const v1 = (row + 1) / ATLAS_GRID_ROWS;

      const x0 = tileX * TILE_SIZE;
      const y0 = tileY * TILE_SIZE;
      const x1 = x0 + TILE_SIZE;
      const y1 = y0 + TILE_SIZE;

      const base = quadCount * 4;
      positions.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0);
      uvs.push(u0, v1, u1, v1, u1, v0, u0, v0);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      quadCount += 1;
    }
  }

  if (quadCount === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
