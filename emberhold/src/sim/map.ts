import {
  BUILD_HP,
  FOOTPRINT,
  MAP_H,
  MAP_W,
  NODE_HP,
} from './config.ts';
import type { BuildKind, Building, TileNode, World } from './types.ts';

export function inBounds(gx: number, gy: number): boolean {
  return gx >= 0 && gy >= 0 && gx < MAP_W && gy < MAP_H;
}

export function tileAt(world: World, x: number, y: number): TileNode | null {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (!inBounds(gx, gy)) return null;
  return world.tiles[gy][gx];
}

export function occAt(world: World, x: number, y: number): number {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (!inBounds(gx, gy)) return -1;
  return world.occ[gy][gx];
}

export function footprintClear(world: World, gx: number, gy: number, w: number, h: number): boolean {
  for (let y = gy; y < gy + h; y++) {
    for (let x = gx; x < gx + w; x++) {
      if (!inBounds(x, y)) return false;
      if (world.tiles[y][x]) return false;
      if (world.occ[y][x]) return false;
    }
  }
  return true;
}

export function stampBuilding(world: World, b: Building): void {
  for (let y = b.gy; y < b.gy + b.h; y++) {
    for (let x = b.gx; x < b.gx + b.w; x++) {
      world.occ[y][x] = b.id;
    }
  }
}

export function unstampBuilding(world: World, b: Building): void {
  for (let y = b.gy; y < b.gy + b.h; y++) {
    for (let x = b.gx; x < b.gx + b.w; x++) {
      if (inBounds(x, y) && world.occ[y][x] === b.id) world.occ[y][x] = 0;
    }
  }
}

export function buildingAt(world: World, gx: number, gy: number): Building | null {
  if (!inBounds(gx, gy)) return null;
  const id = world.occ[gy][gx];
  if (!id) return null;
  return world.buildings.find((b) => b.id === id) ?? null;
}

export function makeBuilding(world: World, kind: BuildKind, gx: number, gy: number): Building {
  const foot = FOOTPRINT[kind];
  const hp = BUILD_HP[kind];
  return {
    id: world.nextId++,
    kind,
    gx,
    gy,
    w: foot.w,
    h: foot.h,
    hp,
    maxHp: hp,
    trainLeft: 0,
    lastHitAt: -999,
  };
}

export function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export function buildingCenter(b: Building): { x: number; y: number } {
  return { x: b.gx + b.w / 2, y: b.gy + b.h / 2 };
}

export function nearBuilding(x: number, y: number, b: Building, extra = 0.9): boolean {
  const cx = Math.max(b.gx, Math.min(x, b.gx + b.w));
  const cy = Math.max(b.gy, Math.min(y, b.gy + b.h));
  return dist(x, y, cx, cy) <= extra;
}

export function hash(x: number, y: number, seed: number): number {
  let n = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

export function facingFrom(dx: number, dy: number): 'se' | 'sw' | 'ne' | 'nw' {
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'se' : 'nw';
  return dy >= 0 ? 'sw' : 'ne';
}

export function nodeHp(kind: TileNode['kind']): number {
  return NODE_HP[kind];
}
