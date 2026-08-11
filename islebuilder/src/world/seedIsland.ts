import type { Tilemap } from './tilemap.ts';
import { TerrainLayer } from './layers.ts';
import type { PropMap } from '../props/propmap.ts';
import { createPropUid } from '../props/propmap.ts';
import { getPropDefinition } from '../props/catalog.ts';
import { canPlaceProp } from '../props/placement.ts';

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

/** RNG determinístico (mulberry32) — a ilha inicial deve ser idêntica em todo boot. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [defId, peso] — sorteio ponderado dentro de cada categoria de scatter. */
type WeightedPick = readonly (readonly [string, number])[];

const GRASS_TREES: WeightedPick = [
  ['tree_oak', 4],
  ['tree_pine', 3],
  ['tree_apple', 2],
  ['tree_cherry', 1],
];
const GRASS_SMALL: WeightedPick = [
  ['bush_small', 3],
  ['bush_large', 2],
  ['flower_red', 2],
  ['flower_yellow', 2],
  ['flower_white', 1],
  ['flower_pink', 1],
  ['tulip', 1],
  ['daisy', 1],
  ['grass_tuft', 3],
  ['fern', 2],
  ['clover', 1],
  ['mushroom', 1],
  ['rock_small', 1],
];
const SAND_SCATTER: WeightedPick = [
  ['tree_palm', 4],
  ['rock_small', 2],
  ['rock_large', 1],
  ['shell', 3],
  ['starfish', 2],
  ['driftwood', 1],
  ['pebble', 3],
];

function pickWeighted(rng: () => number, table: WeightedPick): string {
  let total = 0;
  for (const [, weight] of table) total += weight;
  let roll = rng() * total;
  for (const [id, weight] of table) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return table[table.length - 1]![0];
}

/** Chance por tile de grama de receber uma árvore / um item pequeno. */
const TREE_CHANCE = 0.11;
const GRASS_SMALL_CHANCE = 0.14;
/** Chance por tile de areia de receber scatter (palmeira, concha, rocha...). */
const SAND_CHANCE = 0.05;

/**
 * Populates the starter island with dense vegetation/decor, like the
 * reference frame (assets/status/jogo_exemplo.png): tree clusters + small
 * flora on grass, palms/shells/rocks on sand. Bypasses HistoryManager for
 * the same reason as seedStarterIsland — initial state, not undoable.
 * Deterministic RNG: same island on every boot.
 */
export function seedStarterProps(tilemap: Tilemap, propMap: PropMap): void {
  const rng = mulberry32(0x15731234);
  const maxR = BASE_RADIUS + MARGIN;

  for (let dy = -maxR; dy <= maxR; dy++) {
    for (let dx = -maxR; dx <= maxR; dx++) {
      const layer = tilemap.getLayer(dx, dy);

      let defId: string | null = null;
      if (layer === TerrainLayer.Grass) {
        const roll = rng();
        if (roll < TREE_CHANCE) defId = pickWeighted(rng, GRASS_TREES);
        else if (roll < TREE_CHANCE + GRASS_SMALL_CHANCE) defId = pickWeighted(rng, GRASS_SMALL);
      } else if (layer === TerrainLayer.Sand) {
        if (rng() < SAND_CHANCE) defId = pickWeighted(rng, SAND_SCATTER);
      }
      if (!defId) continue;

      const def = getPropDefinition(defId);
      if (!def) continue;
      if (!canPlaceProp(tilemap, propMap, def, dx, dy, getPropDefinition).valid) continue;

      propMap.add(
        {
          uid: createPropUid(),
          defId,
          tileX: dx,
          tileY: dy,
          scale: 0.85 + rng() * 0.35,
          flip: rng() < 0.5,
        },
        def,
      );
    }
  }
}
