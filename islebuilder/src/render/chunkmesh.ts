import * as THREE from 'three';
import { CHUNK_SIZE, TILE_SIZE } from '../world/constants.ts';
import type { Chunk, Tilemap } from '../world/tilemap.ts';
import { computeBlobMask, sampleNeighbors } from '../world/autotiler.ts';
import { TerrainLayer } from '../world/layers.ts';
import { TERRAIN_ATLAS_COLS, TERRAIN_ATLAS_ROWS } from './art/terrainAtlas.ts';

/** Decide if a tile contributes to this render layer mesh. */
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

/** Alcance (em tiles) da faixa de areia molhada a partir da água. */
const WET_RANGE_TILES = 2.0;
/** Raio de busca por água ao redor de um canto de tile. */
const WET_SEARCH_RADIUS = 3;

/**
 * Quão "molhado" (0..1) é um canto de tile, pela distância à água mais próxima.
 * Interpolado por vértice no shader, dá um gradiente suave da linha d'água
 * para o interior da praia.
 */
function cornerWetness(tilemap: Tilemap, cornerX: number, cornerY: number): number {
  let minD2 = Infinity;
  for (let ty = cornerY - WET_SEARCH_RADIUS; ty < cornerY + WET_SEARCH_RADIUS; ty++) {
    for (let tx = cornerX - WET_SEARCH_RADIUS; tx < cornerX + WET_SEARCH_RADIUS; tx++) {
      if (tilemap.getLayer(tx, ty) !== TerrainLayer.Water) continue;
      const dx = tx + 0.5 - cornerX;
      const dy = ty + 0.5 - cornerY;
      const d2 = dx * dx + dy * dy;
      if (d2 < minD2) minD2 = d2;
    }
  }
  if (minD2 === Infinity) return 0;
  const t = 1 - (Math.sqrt(minD2) - 0.7) / WET_RANGE_TILES;
  return Math.min(1, Math.max(0, t));
}

export interface LayerGeometryOptions {
  /** Emite o atributo por-vértice `aWet` (areia molhada perto da água). */
  shoreWetness?: boolean;
}

/**
 * Builds one chunk geometry for one terrain render layer. CanvasTexture flips
 * the generated canvas vertically on upload, so UVs must address the inverted
 * atlas row. Without that, mask 255 samples row 0 (mask 15) and solid terrain
 * gets periodic corner holes.
 */
export function buildLayerGeometry(
  tilemap: Tilemap,
  chunk: Chunk,
  threshold: number,
  options?: LayerGeometryOptions,
): THREE.BufferGeometry | null {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const wets: number[] = [];
  const wetCache = new Map<string, number>();
  const wetAt = (cx: number, cy: number): number => {
    const key = `${cx},${cy}`;
    let w = wetCache.get(key);
    if (w === undefined) {
      w = cornerWetness(tilemap, cx, cy);
      wetCache.set(key, w);
    }
    return w;
  };
  let quadCount = 0;

  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const layer = chunk.layers[ly * CHUNK_SIZE + lx];
      if (!shouldRenderTile(layer, threshold)) continue;

      const tileX = chunk.cx * CHUNK_SIZE + lx;
      const tileY = chunk.cy * CHUNK_SIZE + ly;
      const mask = computeBlobMask(sampleNeighbors(tilemap, tileX, tileY, threshold));
      const col = mask % TERRAIN_ATLAS_COLS;
      const row = Math.floor(mask / TERRAIN_ATLAS_COLS);
      const atlasRow = TERRAIN_ATLAS_ROWS - 1 - row;
      const u0 = col / TERRAIN_ATLAS_COLS;
      const u1 = (col + 1) / TERRAIN_ATLAS_COLS;
      const v0 = atlasRow / TERRAIN_ATLAS_ROWS;
      const v1 = (atlasRow + 1) / TERRAIN_ATLAS_ROWS;

      const x0 = tileX * TILE_SIZE;
      const y0 = tileY * TILE_SIZE;
      const x1 = x0 + TILE_SIZE;
      const y1 = y0 + TILE_SIZE;

      // Plano XZ (Y=0): lógico +Y (norte) → mundo −Z.
      const base = quadCount * 4;
      positions.push(
        x0, 0, -y0,
        x1, 0, -y0,
        x1, 0, -y1,
        x0, 0, -y1,
      );
      uvs.push(u0, v1, u1, v1, u1, v0, u0, v0);
      // Winding para normal +Y (cima).
      indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
      if (options?.shoreWetness) {
        // Mesma ordem dos vértices de `positions`: (x0,y0) (x1,y0) (x1,y1) (x0,y1).
        wets.push(
          wetAt(tileX, tileY),
          wetAt(tileX + 1, tileY),
          wetAt(tileX + 1, tileY + 1),
          wetAt(tileX, tileY + 1),
        );
      }
      quadCount += 1;
    }
  }

  if (quadCount === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (options?.shoreWetness) {
    geometry.setAttribute('aWet', new THREE.Float32BufferAttribute(wets, 1));
  }
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
