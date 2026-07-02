import { CHUNK_SIZE } from '../world/constants.ts';
import { TerrainLayer } from '../world/layers.ts';
import type { Tilemap } from '../world/tilemap.ts';
import type { CoastManager } from '../world/coast.ts';
import { isDeepWaterTile, isShallowWaterTile, isWalkableTile } from './walkability.ts';

export interface TerrainCensus {
  grassTiles: number;
  walkableTiles: number;
  deepWaterTiles: number;
  shallowWaterTiles: number;
  /** Sampled walkable tile coords for spawning / wander targets. */
  walkableSamples: { tileX: number; tileY: number; component: number }[];
  deepWaterSamples: { tileX: number; tileY: number }[];
  shallowWaterSamples: { tileX: number; tileY: number }[];
  bridgeTiles: { tileX: number; tileY: number }[];
  /** landComponent id per walkable sample index */
  componentCount: number;
}

const MAX_SAMPLES = 512;

export class TerrainCensusTracker {
  private census: TerrainCensus = emptyCensus();
  private dirty = true;

  markDirty(): void {
    this.dirty = true;
  }

  get(): TerrainCensus {
    if (this.dirty) {
      this.census = { ...emptyCensus() };
      this.dirty = false;
    }
    return this.census;
  }

  rebuild(tilemap: Tilemap, coast: CoastManager): TerrainCensus {
    let walkableCount = 0;
    let deepCount = 0;
    let shallowCount = 0;
    const walkableList: { tileX: number; tileY: number }[] = [];
    const deepList: { tileX: number; tileY: number }[] = [];
    const shallowList: { tileX: number; tileY: number }[] = [];
    const bridgeTiles: { tileX: number; tileY: number }[] = [];
    let grassTotal = 0;

    for (const chunk of tilemap.allChunks()) {
      const baseX = chunk.cx * CHUNK_SIZE;
      const baseY = chunk.cy * CHUNK_SIZE;
      for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          const tileX = baseX + lx;
          const tileY = baseY + ly;
          const layer = chunk.layers[ly * CHUNK_SIZE + lx];

          if (layer === TerrainLayer.Grass) grassTotal++;

          if (isWalkableTile(tilemap, tileX, tileY)) {
            walkableCount++;
            if (walkableList.length < MAX_SAMPLES * 4) {
              walkableList.push({ tileX, tileY });
            }
          }

          if (layer === TerrainLayer.Bridge) {
            bridgeTiles.push({ tileX, tileY });
          }

          if (isDeepWaterTile(tilemap, coast, tileX, tileY)) {
            deepCount++;
            if (deepList.length < MAX_SAMPLES * 2) {
              deepList.push({ tileX, tileY });
            }
          } else if (isShallowWaterTile(tilemap, coast, tileX, tileY)) {
            shallowCount++;
            if (shallowList.length < MAX_SAMPLES) {
              shallowList.push({ tileX, tileY });
            }
          }
        }
      }
    }

    const { samples, componentCount } = labelWalkableComponents(tilemap, walkableList, bridgeTiles);

    this.census = {
      grassTiles: grassTotal,
      walkableTiles: walkableCount,
      deepWaterTiles: deepCount,
      shallowWaterTiles: shallowCount,
      walkableSamples: samples,
      deepWaterSamples: subsample(deepList, MAX_SAMPLES),
      shallowWaterSamples: subsample(shallowList, MAX_SAMPLES),
      bridgeTiles,
      componentCount,
    };
    this.dirty = false;
    return this.census;
  }
}

function emptyCensus(): TerrainCensus {
  return {
    grassTiles: 0,
    walkableTiles: 0,
    deepWaterTiles: 0,
    shallowWaterTiles: 0,
    walkableSamples: [],
    deepWaterSamples: [],
    shallowWaterSamples: [],
    bridgeTiles: [],
    componentCount: 0,
  };
}

function subsample<T>(list: T[], max: number): T[] {
  if (list.length <= max) return list;
  const step = list.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    out.push(list[Math.floor(i * step)]!);
  }
  return out;
}

/** Flood-fill walkable tiles into land components; bridges merge adjacent land masses. */
export function labelWalkableComponents(
  tilemap: Tilemap,
  walkableList: { tileX: number; tileY: number }[],
  bridgeTiles: { tileX: number; tileY: number }[],
): { samples: { tileX: number; tileY: number; component: number }[]; componentCount: number } {
  const componentOf = new Map<string, number>();
  let componentCount = 0;

  const key = (x: number, y: number) => `${x},${y}`;

  const bfs = (startX: number, startY: number, id: number): void => {
    const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
    componentOf.set(key(startX, startY), id);
    while (queue.length > 0) {
      const { x, y } = queue.pop()!;
      const neighbors = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1],
      ];
      for (const [nx, ny] of neighbors) {
        const k = key(nx, ny);
        if (componentOf.has(k)) continue;
        if (!isWalkableTile(tilemap, nx, ny)) continue;
        componentOf.set(k, id);
        queue.push({ x: nx, y: ny });
      }
    }
  };

  for (const tile of walkableList) {
    const k = key(tile.tileX, tile.tileY);
    if (componentOf.has(k)) continue;
    bfs(tile.tileX, tile.tileY, componentCount);
    componentCount++;
  }

  // Bridges connect land on both sides — merge components linked by each bridge
  for (const bridge of bridgeTiles) {
    const neighborComps = new Set<number>();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = key(bridge.tileX + dx, bridge.tileY + dy);
      const comp = componentOf.get(k);
      if (comp !== undefined) neighborComps.add(comp);
    }
    if (neighborComps.size < 2) continue;
    const comps = [...neighborComps];
    const target = comps[0]!;
    for (let i = 1; i < comps.length; i++) {
      const from = comps[i]!;
      for (const [k, c] of componentOf) {
        if (c === from) componentOf.set(k, target);
      }
    }
  }

  const samples = subsample(walkableList, MAX_SAMPLES).map((t) => ({
    tileX: t.tileX,
    tileY: t.tileY,
    component: componentOf.get(key(t.tileX, t.tileY)) ?? 0,
  }));

  const uniqueComps = new Set(componentOf.values());
  return { samples, componentCount: uniqueComps.size };
}

/** Pick a wander target, optionally on a different land component (bridge crossing). */
export function pickWalkTarget(
  census: TerrainCensus,
  currentComponent: number,
  crossBridgeChance = 0.22,
): { tileX: number; tileY: number; component: number } | null {
  const samples = census.walkableSamples;
  if (samples.length === 0) return null;

  const wantCross = census.componentCount > 1 && Math.random() < crossBridgeChance;
  if (wantCross) {
    const other = samples.filter((s) => s.component !== currentComponent);
    if (other.length > 0) {
      return other[Math.floor(Math.random() * other.length)]!;
    }
  }
  return samples[Math.floor(Math.random() * samples.length)]!;
}

export function targetVillagerCount(census: TerrainCensus, perGrass: number, max: number): number {
  return Math.min(max, Math.floor(census.grassTiles * perGrass));
}

export function targetFishCount(census: TerrainCensus, perDeep: number, max: number): number {
  const water = census.deepWaterTiles + census.shallowWaterTiles;
  return Math.min(max, Math.floor(water * perDeep * 0.5 + census.deepWaterTiles * perDeep));
}

export function targetMarineCount(census: TerrainCensus, perDeep: number, max: number): number {
  return Math.min(max, Math.max(0, Math.floor(census.deepWaterTiles * perDeep)));
}

export function targetShipCount(census: TerrainCensus, perDeep: number, max: number): number {
  return Math.min(max, Math.max(0, Math.floor(census.deepWaterTiles * perDeep)));
}
