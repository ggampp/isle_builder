import { CHUNK_SIZE } from './constants.ts';
import { TerrainLayer } from './layers.ts';
import type { Chunk } from './tilemap.ts';
import type { Tilemap } from './tilemap.ts';

export interface LandBounds {
  minTileX: number;
  minTileY: number;
  maxTileX: number;
  maxTileY: number;
  landTileCount: number;
  centroidTileX: number;
  centroidTileY: number;
}

function collectLandTiles(chunks: Chunk[]): { tiles: Set<string>; count: number; sumX: number; sumY: number } {
  const tiles = new Set<string>();
  let count = 0;
  let sumX = 0;
  let sumY = 0;

  for (const chunk of chunks) {
    for (let i = 0; i < chunk.layers.length; i++) {
      if (chunk.layers[i] > TerrainLayer.Water) {
        const lx = i % CHUNK_SIZE;
        const ly = Math.floor(i / CHUNK_SIZE);
        const tx = chunk.cx * CHUNK_SIZE + lx;
        const ty = chunk.cy * CHUNK_SIZE + ly;
        tiles.add(`${tx},${ty}`);
        count++;
        sumX += tx;
        sumY += ty;
      }
    }
  }

  return { tiles, count, sumX, sumY };
}

export function computeLandBounds(tilemap: Tilemap): LandBounds | null {
  const chunks = Array.from(tilemap.allChunks());
  const { tiles, count, sumX, sumY } = collectLandTiles(chunks);
  if (count === 0) return null;

  let minTileX = Infinity;
  let minTileY = Infinity;
  let maxTileX = -Infinity;
  let maxTileY = -Infinity;

  for (const key of tiles) {
    const [xStr, yStr] = key.split(',');
    const tx = Number(xStr);
    const ty = Number(yStr);
    if (tx < minTileX) minTileX = tx;
    if (tx > maxTileX) maxTileX = tx;
    if (ty < minTileY) minTileY = ty;
    if (ty > maxTileY) maxTileY = ty;
  }

  return {
    minTileX,
    minTileY,
    maxTileX,
    maxTileY,
    landTileCount: count,
    centroidTileX: sumX / count,
    centroidTileY: sumY / count,
  };
}

export function countIslands(tilemap: Tilemap): number {
  const chunks = Array.from(tilemap.allChunks());
  const { tiles } = collectLandTiles(chunks);
  if (tiles.size === 0) return 0;

  const visited = new Set<string>();
  let islands = 0;

  for (const tile of tiles) {
    if (visited.has(tile)) continue;
    islands++;
    const queue = [tile];
    visited.add(tile);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const [xStr, yStr] = current.split(',');
      const x = Number(xStr);
      const y = Number(yStr);
      for (const n of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) {
        if (tiles.has(n) && !visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
  }

  return islands;
}
