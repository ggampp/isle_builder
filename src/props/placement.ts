import type { Tilemap } from '../world/tilemap.ts';
import { isWalkableLayer } from '../world/layers.ts';
import type { PropDefinition } from './catalog.ts';
import type { PropMap } from './propmap.ts';

export interface PlacementResult {
  valid: boolean;
  reason?: string;
}

export function footprintTiles(def: PropDefinition, tileX: number, tileY: number): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  for (let dy = 0; dy < def.heightTiles; dy++) {
    for (let dx = 0; dx < def.widthTiles; dx++) {
      tiles.push({ x: tileX + dx, y: tileY + dy });
    }
  }
  return tiles;
}

export function canPlaceProp(
  tilemap: Tilemap,
  propMap: PropMap,
  def: PropDefinition,
  tileX: number,
  tileY: number,
  getDef: (id: string) => PropDefinition | undefined,
  ignoreUid?: string,
): PlacementResult {
  const tiles = footprintTiles(def, tileX, tileY);

  for (const t of tiles) {
    const layer = tilemap.getLayer(t.x, t.y);
    if (def.requiresWalkable && !isWalkableLayer(layer)) {
      return { valid: false, reason: 'Requires walkable ground' };
    }
    if (!def.requiresWalkable && layer === 0) {
      return { valid: false, reason: 'Cannot place on water' };
    }
  }

  for (const existing of propMap.all()) {
    if (existing.uid === ignoreUid) continue;
    const eDef = getDef(existing.defId);
    if (!eDef) continue;
    for (const t of footprintTiles(eDef, existing.tileX, existing.tileY)) {
      for (const n of tiles) {
        if (t.x === n.x && t.y === n.y) {
          return { valid: false, reason: 'Overlaps another prop' };
        }
      }
    }
  }

  return { valid: true };
}

/** Sort key for y-sort (higher = drawn later / in front). */
export function propSortY(def: PropDefinition, tileY: number): number {
  return tileY + def.heightTiles - 1;
}
