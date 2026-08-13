import type { Voxel, VoxelGroup } from './types.ts';
import { VoxelGrid, NEIGHBORS } from './grid.ts';

/** Grupos que se ligam por contato 6-conectado (o resto usa juntas). */
const SOLID_JOIN: ReadonlySet<VoxelGroup> = new Set(['structure']);

export function sameSolid(a: Voxel, b: Voxel): boolean {
  if (a.group === b.group) return true;
  return SOLID_JOIN.has(a.group) && SOLID_JOIN.has(b.group);
}

export function connectedComponents(grid: VoxelGrid): Voxel[][] {
  const seen = new Set<number>();
  const result: Voxel[][] = [];
  for (const start of grid.values()) {
    if (seen.has(start.id)) continue;
    const stack: Voxel[] = [start];
    const comp: Voxel[] = [];
    seen.add(start.id);
    while (stack.length > 0) {
      const cur = stack.pop()!;
      comp.push(cur);
      for (const [dx, dy, dz] of NEIGHBORS) {
        const n = grid.get(cur.ix + dx, cur.iy + dy, cur.iz + dz);
        if (!n || seen.has(n.id) || !sameSolid(cur, n)) continue;
        seen.add(n.id);
        stack.push(n);
      }
    }
    result.push(comp);
  }
  return result;
}

/**
 * Um componente de estrutura apoia-se no deck (iy === 1) ou no chão.
 * Portas, correntes e lanternas nunca são "supported" — vivem nas juntas.
 */
export function isSupported(comp: Voxel[]): boolean {
  if (comp.length === 0) return false;
  const group = comp[0].group;
  if (group !== 'structure') return false;
  for (const v of comp) {
    if (v.iy <= 1) return true;
  }
  return false;
}

export function damageAt(
  grid: VoxelGrid,
  wx: number,
  wy: number,
  wz: number,
  radius: number,
  damage: number,
  voxelSize: number,
  direct?: Voxel,
): Voxel[] {
  const destroyed: Voxel[] = [];
  const r2 = radius * radius;
  for (const v of grid.values()) {
    const cx = v.ix * voxelSize;
    const cy = v.iy * voxelSize + voxelSize * 0.5;
    const cz = v.iz * voxelSize;
    const dx = cx - wx;
    const dy = cy - wy;
    const dz = cz - wz;
    const d2 = dx * dx + dy * dy + dz * dz;
    const isDirect = direct !== undefined && v.id === direct.id;
    if (!isDirect && d2 > r2) continue;
    if (isDirect) {
      v.hp -= damage;
    } else {
      const t = 1 - Math.sqrt(d2) / Math.max(radius, 1e-6);
      v.hp -= damage * (0.4 + 0.6 * t);
    }
    if (v.hp <= 0) destroyed.push(v);
  }
  return destroyed;
}

/** Ray vs esfera na pose visual do voxel (portas/lanternas que já se mexeram). */
export function voxelRaycastWorld(
  grid: VoxelGrid,
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  maxDist: number,
  voxelSize: number,
  poseOf: (v: Voxel) => { x: number; y: number; z: number } | null,
): { voxel: Voxel; dist: number; point: { x: number; y: number; z: number } } | null {
  const len = Math.hypot(dir.x, dir.y, dir.z);
  if (len < 1e-8) return null;
  const dx = dir.x / len;
  const dy = dir.y / len;
  const dz = dir.z / len;
  const radius = voxelSize * 0.62;
  const r2 = radius * radius;
  let best: Voxel | null = null;
  let bestT = maxDist;
  for (const v of grid.values()) {
    const p = poseOf(v) ?? { x: v.ix * voxelSize, y: v.iy * voxelSize + voxelSize * 0.5, z: v.iz * voxelSize };
    const ox = origin.x - p.x;
    const oy = origin.y - p.y;
    const oz = origin.z - p.z;
    const b = ox * dx + oy * dy + oz * dz;
    const c = ox * ox + oy * oy + oz * oz - r2;
    const disc = b * b - c;
    if (disc < 0) continue;
    const t = -b - Math.sqrt(disc);
    const hitT = t >= 0 ? t : -b + Math.sqrt(disc);
    if (hitT < 0 || hitT > bestT) continue;
    bestT = hitT;
    best = v;
  }
  if (!best) return null;
  return {
    voxel: best,
    dist: bestT,
    point: { x: origin.x + dx * bestT, y: origin.y + dy * bestT, z: origin.z + dz * bestT },
  };
}

/** DDA em grade de voxels. Origem e direção em metros. */
export function voxelRaycast(
  grid: VoxelGrid,
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  maxDist: number,
  voxelSize: number,
): { voxel: Voxel; dist: number; point: { x: number; y: number; z: number } } | null {
  const len = Math.hypot(dir.x, dir.y, dir.z);
  if (len < 1e-8) return null;
  const dx = dir.x / len;
  const dy = dir.y / len;
  const dz = dir.z / len;

  let x = origin.x;
  let y = origin.y;
  let z = origin.z;
  let ix = Math.round(x / voxelSize);
  let iy = Math.floor(y / voxelSize);
  let iz = Math.round(z / voxelSize);

  const stepX = dx >= 0 ? 1 : -1;
  const stepY = dy >= 0 ? 1 : -1;
  const stepZ = dz >= 0 ? 1 : -1;

  const tDeltaX = dx === 0 ? Infinity : Math.abs(voxelSize / dx);
  const tDeltaY = dy === 0 ? Infinity : Math.abs(voxelSize / dy);
  const tDeltaZ = dz === 0 ? Infinity : Math.abs(voxelSize / dz);

  const nextBound = (i: number, step: number, size: number, isY: boolean): number => {
    if (isY) return step > 0 ? (i + 1) * size : i * size;
    const center = i * size;
    return step > 0 ? center + size * 0.5 : center - size * 0.5;
  };

  let tMaxX = dx === 0 ? Infinity : (nextBound(ix, stepX, voxelSize, false) - x) / dx;
  let tMaxY = dy === 0 ? Infinity : (nextBound(iy, stepY, voxelSize, true) - y) / dy;
  let tMaxZ = dz === 0 ? Infinity : (nextBound(iz, stepZ, voxelSize, false) - z) / dz;
  if (tMaxX < 0) tMaxX = 0;
  if (tMaxY < 0) tMaxY = 0;
  if (tMaxZ < 0) tMaxZ = 0;

  let t = 0;
  while (t <= maxDist) {
    const hit = grid.get(ix, iy, iz);
    if (hit) {
      return {
        voxel: hit,
        dist: t,
        point: { x: origin.x + dx * t, y: origin.y + dy * t, z: origin.z + dz * t },
      };
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      ix += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
    } else if (tMaxY < tMaxZ) {
      iy += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
    } else {
      iz += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
    }
  }
  return null;
}
