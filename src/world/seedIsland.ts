import type { Tilemap } from './tilemap.ts';
import { TerrainLayer } from './layers.ts';

/** Wobbly radius per angle so the starter island isn't a perfect circle. */
function islandRadius(angle: number, base: number): number {
  return (
    base +
    3.2 * Math.sin(angle * 2 + 0.6) +
    1.6 * Math.sin(angle * 5 + 2.1) +
    0.8 * Math.sin(angle * 9 + 4.0)
  );
}

const BASE_RADIUS = 17;
const MARGIN = 6;
/** Width of the sand beach ring left around the grass patch. */
const BEACH_WIDTH = 3;
/** Tiles left of this x (relative to island center) never get grass — stays a sand-only spit. */
const GRASS_MIN_X = -5;

/**
 * Stamps a starter island centered on tile (0,0): sand-only on the west
 * side, sand+grass on the east side, so the game never opens on empty
 * ocean. Bypasses `ToolSystem`/`HistoryManager` on purpose — this is
 * initial world state, not a player action, so it must not be undoable.
 */
export function seedStarterIsland(tilemap: Tilemap): void {
  const maxR = BASE_RADIUS + MARGIN;

  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      const dist = Math.hypot(dx, dy);
      if (dist > islandRadius(Math.atan2(dy, dx), BASE_RADIUS)) continue;
      tilemap.paintLayer(dx, dy, TerrainLayer.Sand);
    }
  }

  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      if (dx < GRASS_MIN_X) continue;
      const dist = Math.hypot(dx, dy);
      if (dist > islandRadius(Math.atan2(dy, dx), BASE_RADIUS) - BEACH_WIDTH) continue;
      tilemap.paintLayer(dx, dy, TerrainLayer.Grass);
    }
  }
}
