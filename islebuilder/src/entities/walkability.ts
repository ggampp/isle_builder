import { TILE_SIZE } from '../world/constants.ts';
import { TerrainLayer, isWalkableLayer } from '../world/layers.ts';
import type { Tilemap } from '../world/tilemap.ts';
import type { CoastManager } from '../world/coast.ts';

export function tileCenter(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function worldToTile(x: number, y: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(x / TILE_SIZE),
    ty: Math.floor(y / TILE_SIZE),
  };
}

export function isWalkableTile(tilemap: Tilemap, tileX: number, tileY: number): boolean {
  return isWalkableLayer(tilemap.getLayer(tileX, tileY));
}

export function isWaterTile(tilemap: Tilemap, tileX: number, tileY: number): boolean {
  return tilemap.getLayer(tileX, tileY) === TerrainLayer.Water;
}

export function isDeepWaterTile(tilemap: Tilemap, coast: CoastManager, tileX: number, tileY: number): boolean {
  if (!isWaterTile(tilemap, tileX, tileY)) return false;
  return !coast.getTileInfo(tileX, tileY).isShallow;
}

export function isShallowWaterTile(tilemap: Tilemap, coast: CoastManager, tileX: number, tileY: number): boolean {
  if (!isWaterTile(tilemap, tileX, tileY)) return false;
  return coast.getTileInfo(tileX, tileY).isShallow;
}

/** Teleport agent to nearest walkable tile (spiral search). Returns false if none found. */
export function findNearestWalkable(
  tilemap: Tilemap,
  fromX: number,
  fromY: number,
  maxRadius = 48,
): { tileX: number; tileY: number } | null {
  if (isWalkableTile(tilemap, fromX, fromY)) return { tileX: fromX, tileY: fromY };

  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const tx = fromX + dx;
        const ty = fromY + dy;
        if (isWalkableTile(tilemap, tx, ty)) return { tileX: tx, tileY: ty };
      }
    }
  }
  return null;
}

export function findNearestDeepWater(
  tilemap: Tilemap,
  coast: CoastManager,
  fromX: number,
  fromY: number,
  maxRadius = 64,
): { tileX: number; tileY: number } | null {
  if (isDeepWaterTile(tilemap, coast, fromX, fromY)) return { tileX: fromX, tileY: fromY };

  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        const tx = fromX + dx;
        const ty = fromY + dy;
        if (isDeepWaterTile(tilemap, coast, tx, ty)) return { tileX: tx, tileY: ty };
      }
    }
  }
  return null;
}

export function pickDirFromDelta(dx: number, dy: number): 0 | 1 | 2 | 3 {
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 2 : 3;
  return dy >= 0 ? 1 : 0;
}
