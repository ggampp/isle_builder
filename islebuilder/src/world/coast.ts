import { CHUNK_SIZE } from './constants.ts';
import { isLandLayer, TerrainLayer } from './layers.ts';
import type { Tilemap } from './tilemap.ts';
import { chunkKey } from './tilemap.ts';

/** Distância máxima (em tiles) da terra para calcular costa. */
export const COAST_MAX_DISTANCE = 8;

/** Profundidade base da faixa de água rasa (modulada por ruído). */
export const SHALLOW_BASE_DEPTH = 5;

export const DecorationKind = {
  None: 0,
  CoralPink: 1,
  CoralOrange: 2,
  Algae: 3,
  SandPatch: 4,
} as const;

export type DecorationKindValue = (typeof DecorationKind)[keyof typeof DecorationKind];

export interface CoastTileInfo {
  distance: number;
  isShallow: boolean;
  hasFoam: boolean;
  decoration: DecorationKindValue;
}

/** Hash determinístico 0..1 a partir da posição do tile (independe de ordem de edição). */
export function cellHash01(tileX: number, tileY: number): number {
  let h = (tileX * 374761393 + tileY * 668265263) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = (h * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruído tipo simplex 2D barato para contorno orgânico da água rasa. */
export function coastNoise(tileX: number, tileY: number): number {
  const x = tileX * 0.17;
  const y = tileY * 0.23;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const a = cellHash01(ix, iy);
  const b = cellHash01(ix + 1, iy);
  const c = cellHash01(ix, iy + 1);
  const d = cellHash01(ix + 1, iy + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/**
 * Distância chamfer 3-4 até a terra mais próxima, limitada a COAST_MAX_DISTANCE.
 * Retorna 0 para terra, 1..N para água/ponte, COAST_MAX_DISTANCE+1 se fora do alcance.
 */
export function computeDistanceField(
  tilemap: Tilemap,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): Map<string, number> {
  const dist = new Map<string, number>();
  const queue: { x: number; y: number; d: number }[] = [];

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const key = `${x},${y}`;
      if (isLandLayer(tilemap.getLayer(x, y))) {
        dist.set(key, 0);
        queue.push({ x, y, d: 0 });
      } else {
        dist.set(key, COAST_MAX_DISTANCE + 1);
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const { x, y, d } = queue[head++]!;
    if (d >= COAST_MAX_DISTANCE) continue;

    const neighbors = [
      { x: x + 1, y, cost: 1 },
      { x: x - 1, y, cost: 1 },
      { x, y: y + 1, cost: 1 },
      { x, y: y - 1, cost: 1 },
      { x: x + 1, y: y + 1, cost: 1.4 },
      { x: x - 1, y: y + 1, cost: 1.4 },
      { x: x + 1, y: y - 1, cost: 1.4 },
      { x: x - 1, y: y - 1, cost: 1.4 },
    ];

    for (const n of neighbors) {
      if (n.x < minX || n.x > maxX || n.y < minY || n.y > maxY) continue;
      const key = `${n.x},${n.y}`;
      const nd = d + n.cost;
      const prev = dist.get(key)!;
      if (nd < prev) {
        dist.set(key, nd);
        queue.push({ x: n.x, y: n.y, d: nd });
      }
    }
  }

  return dist;
}

export function getCoastTileInfo(tileX: number, tileY: number, distance: number, tilemap: Tilemap): CoastTileInfo {
  const layer = tilemap.getLayer(tileX, tileY);

  if (layer === TerrainLayer.Bridge) {
    return { distance, isShallow: false, hasFoam: false, decoration: DecorationKind.None };
  }

  const onWater = layer === 0;

  if (!onWater || distance <= 0 || distance > COAST_MAX_DISTANCE) {
    return { distance, isShallow: false, hasFoam: false, decoration: DecorationKind.None };
  }

  const noise = coastNoise(tileX, tileY);
  const organicDepth = SHALLOW_BASE_DEPTH + (noise - 0.5) * 2.5;
  const isShallow = distance <= organicDepth;

  if (!isShallow) {
    return { distance, isShallow: false, hasFoam: false, decoration: DecorationKind.None };
  }

  const hasFoam = distance <= 1.5 && touchesSand(tilemap, tileX, tileY);
  const decoration = pickDecoration(tileX, tileY, distance);

  return { distance, isShallow, hasFoam, decoration };
}

function touchesSand(tilemap: Tilemap, tileX: number, tileY: number): boolean {
  const offsets = [
    [0, 1], [0, -1], [1, 0], [-1, 0],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
  ];
  for (const [dx, dy] of offsets) {
    if (tilemap.getLayer(tileX + dx, tileY + dy) === 1) return true;
  }
  return false;
}

function pickDecoration(tileX: number, tileY: number, distance: number): DecorationKindValue {
  // Sparse accents only in mid-shallow band — avoid carpeting the whole reef.
  if (distance < 2.5 || distance > 5.5) return DecorationKind.None;

  const h = cellHash01(tileX * 17 + 3, tileY * 31 + 7);
  if (h > 0.09) return DecorationKind.None;

  const kindRoll = cellHash01(tileX + 101, tileY - 53);
  if (kindRoll < 0.12) return DecorationKind.CoralPink;
  if (kindRoll < 0.22) return DecorationKind.CoralOrange;
  if (kindRoll < 0.55) return DecorationKind.Algae;
  return DecorationKind.SandPatch;
}

/**
 * Gerencia recálculo incremental da costa: marca chunks afetados quando
 * terra muda e expõe dados por tile para o renderer.
 */
export class CoastManager {
  private readonly tilemap: Tilemap;
  private readonly dirtyChunks = new Set<string>();
  private readonly cache = new Map<string, Map<string, CoastTileInfo>>();

  constructor(tilemap: Tilemap) {
    this.tilemap = tilemap;
  }

  onTileChanged(tileX: number, tileY: number, oldLayer: number, newLayer: number): void {
    const landChanged = isLandLayer(oldLayer) !== isLandLayer(newLayer);
    const sandChanged =
      (oldLayer === 1 || newLayer === 1) ||
      (oldLayer === 0 && newLayer === 1) ||
      (oldLayer === 1 && newLayer === 0);
    if (!landChanged && !sandChanged) return;

    this.markRegionDirty(tileX, tileY);
  }

  markAllDirty(): void {
    for (const chunk of this.tilemap.allChunks()) {
      this.dirtyChunks.add(chunkKey(chunk.cx, chunk.cy));
    }
    if (this.tilemap.allChunks().next().done) {
      this.dirtyChunks.add('0,0');
    }
  }

  /** Chunks com costa desatualizada (para o renderer). */
  consumeDirtyChunks(): string[] {
    const keys = [...this.dirtyChunks];
    this.dirtyChunks.clear();
    return keys;
  }

  getTileInfo(tileX: number, tileY: number): CoastTileInfo {
    const cx = Math.floor(tileX / CHUNK_SIZE);
    const cy = Math.floor(tileY / CHUNK_SIZE);
    const key = chunkKey(cx, cy);
    let chunkCache = this.cache.get(key);
    if (!chunkCache) {
      chunkCache = this.buildChunkCache(cx, cy);
      this.cache.set(key, chunkCache);
    }
    const localKey = `${tileX},${tileY}`;
    return chunkCache.get(localKey) ?? {
      distance: COAST_MAX_DISTANCE + 1,
      isShallow: false,
      hasFoam: false,
      decoration: DecorationKind.None,
    };
  }

  rebuildDirty(): string[] {
    const keys = [...this.dirtyChunks];
    this.dirtyChunks.clear();
    for (const key of keys) {
      const [cxStr, cyStr] = key.split(',');
      const cx = Number(cxStr);
      const cy = Number(cyStr);
      this.cache.set(key, this.buildChunkCache(cx, cy));
      this.markNeighborCachesStale(cx, cy);
    }
    return keys;
  }

  invalidateAll(): void {
    this.cache.clear();
    this.markAllDirty();
  }

  private markRegionDirty(tileX: number, tileY: number): void {
    const margin = COAST_MAX_DISTANCE + 2;
    const minCX = Math.floor((tileX - margin) / CHUNK_SIZE);
    const maxCX = Math.floor((tileX + margin) / CHUNK_SIZE);
    const minCY = Math.floor((tileY - margin) / CHUNK_SIZE);
    const maxCY = Math.floor((tileY + margin) / CHUNK_SIZE);

    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        this.dirtyChunks.add(chunkKey(cx, cy));
        this.cache.delete(chunkKey(cx, cy));
      }
    }
  }

  private markNeighborCachesStale(cx: number, cy: number): void {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        this.cache.delete(chunkKey(cx + dx, cy + dy));
      }
    }
  }

  private buildChunkCache(cx: number, cy: number): Map<string, CoastTileInfo> {
    const margin = COAST_MAX_DISTANCE + 1;
    const baseX = cx * CHUNK_SIZE;
    const baseY = cy * CHUNK_SIZE;
    const minX = baseX - margin;
    const minY = baseY - margin;
    const maxX = baseX + CHUNK_SIZE - 1 + margin;
    const maxY = baseY + CHUNK_SIZE - 1 + margin;

    const distField = computeDistanceField(this.tilemap, minX, minY, maxX, maxY);
    const chunkCache = new Map<string, CoastTileInfo>();

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const tileX = baseX + lx;
        const tileY = baseY + ly;
        const d = distField.get(`${tileX},${tileY}`) ?? COAST_MAX_DISTANCE + 1;
        chunkCache.set(`${tileX},${tileY}`, getCoastTileInfo(tileX, tileY, d, this.tilemap));
      }
    }

    return chunkCache;
  }
}
