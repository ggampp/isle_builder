import { MATERIALS } from './types.ts';
import type { MatId, Voxel, VoxelGroup } from './types.ts';
import { voxelKey } from './types.ts';

const NEIGHBORS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

export class VoxelGrid {
  private voxels = new Map<string, Voxel>();
  private nextId = 1;

  get size(): number {
    return this.voxels.size;
  }

  values(): Iterable<Voxel> {
    return this.voxels.values();
  }

  get(ix: number, iy: number, iz: number): Voxel | undefined {
    return this.voxels.get(voxelKey(ix, iy, iz));
  }

  has(ix: number, iy: number, iz: number): boolean {
    return this.voxels.has(voxelKey(ix, iy, iz));
  }

  add(ix: number, iy: number, iz: number, mat: MatId, group: VoxelGroup): Voxel | undefined {
    const key = voxelKey(ix, iy, iz);
    if (this.voxels.has(key)) return undefined;
    const voxel: Voxel = {
      id: this.nextId++,
      ix, iy, iz, mat, group,
      hp: MATERIALS[mat].hp,
    };
    this.voxels.set(key, voxel);
    return voxel;
  }

  remove(voxel: Voxel): boolean {
    return this.voxels.delete(voxelKey(voxel.ix, voxel.iy, voxel.iz));
  }

  neighbors(voxel: Voxel): Voxel[] {
    const out: Voxel[] = [];
    for (const [dx, dy, dz] of NEIGHBORS) {
      const n = this.get(voxel.ix + dx, voxel.iy + dy, voxel.iz + dz);
      if (n) out.push(n);
    }
    return out;
  }

  fillBox(
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    mat: MatId,
    group: VoxelGroup,
  ): Voxel[] {
    const added: Voxel[] = [];
    const xa = Math.min(x0, x1);
    const xb = Math.max(x0, x1);
    const ya = Math.min(y0, y1);
    const yb = Math.max(y0, y1);
    const za = Math.min(z0, z1);
    const zb = Math.max(z0, z1);
    for (let iy = ya; iy <= yb; iy++) {
      for (let iz = za; iz <= zb; iz++) {
        for (let ix = xa; ix <= xb; ix++) {
          const v = this.add(ix, iy, iz, mat, group);
          if (v) added.push(v);
        }
      }
    }
    return added;
  }

  cloneEmpty(): VoxelGrid {
    return new VoxelGrid();
  }
}

export { NEIGHBORS };
