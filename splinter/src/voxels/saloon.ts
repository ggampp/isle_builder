import { VoxelGrid } from './grid.ts';
import { VOXEL_SIZE } from './types.ts';
import type { DoorGroup, MatId, Voxel, VoxelGroup } from './types.ts';

const PILLAR_H = 16;

/** Centro do coreto em metros — cena e física usam o mesmo ponto. */
export const GAZEBO = {
  x: -5.16,
  z: 1.2,
  radius: 1.85,
};

function gx(meters: number): number {
  return Math.round(meters / VOXEL_SIZE);
}

function pillar(grid: VoxelGrid, ix: number, iz: number): void {
  grid.fillBox(ix, 1, iz, ix + 2, PILLAR_H, iz + 2, 'adobe', 'structure');
  grid.fillBox(ix - 1, PILLAR_H, iz - 1, ix + 3, PILLAR_H, iz + 3, 'adobe', 'structure');
}

function cactus(grid: VoxelGrid, ix: number, iz: number, h: number): void {
  grid.fillBox(ix, 1, iz, ix, h, iz, 'cactus', 'structure');
  if (h > 6) {
    grid.fillBox(ix + 1, h - 3, iz, ix + 3, h - 3, iz, 'cactus', 'structure');
    grid.fillBox(ix + 3, h - 5, iz, ix + 3, h - 3, iz, 'cactus', 'structure');
  }
}

function rock(grid: VoxelGrid, ix: number, iz: number): void {
  grid.fillBox(ix, 1, iz, ix + 2, 3, iz + 2, 'rock', 'structure');
  grid.add(ix + 1, 4, iz + 1, 'rock', 'structure');
}

function lantern(grid: VoxelGrid, ix: number, iz: number, chain: 0 | 1 | 2 | 3, beamY: number): Voxel[] {
  const links: Voxel[] = [];
  // Folga de 1 voxel sob a viga para os colisores não brigarem com o teto.
  for (let i = 0; i < 2; i++) {
    const v = grid.add(ix, beamY - 2 - i, iz, 'steel', `chain-${chain}` as VoxelGroup);
    if (v) links.push(v);
  }
  const ly = beamY - 4;
  grid.add(ix, ly, iz, 'lantern', `lantern-${chain}` as VoxelGroup);
  grid.add(ix, ly - 1, iz, 'steel', `lantern-${chain}` as VoxelGroup);
  return links;
}

function swingingDoor(
  grid: VoxelGrid,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  iz: number,
  hingeIx: number,
  hingeIz: number,
  group: DoorGroup,
): void {
  grid.fillBox(x0, y0, iz, x1, y1, iz, 'plank', group);
  const mid = Math.floor((y0 + y1) / 2);
  for (const y of [y0 + 2, mid, y1 - 2]) {
    grid.add(hingeIx, y, hingeIz, 'hinge', group);
  }
}

function crate(grid: VoxelGrid, ix: number, iz: number, y0: number, s: number): void {
  grid.fillBox(ix, y0, iz, ix + s - 1, y0 + s - 1, iz + s - 1, 'wood', 'structure');
}

function post(grid: VoxelGrid, ix: number, iz: number, h: number, mat: MatId = 'wood'): void {
  grid.fillBox(ix, 1, iz, ix + 1, h, iz + 1, mat, 'structure');
}

function buildGazebo(grid: VoxelGrid): void {
  const cx = gx(GAZEBO.x);
  const cz = gx(GAZEBO.z);
  const r = 7;
  const h = 12;

  const corners: Array<[number, number]> = [
    [-r, -r], [r - 1, -r], [-r, r - 1], [r - 1, r - 1],
  ];
  for (const [dx, dz] of corners) post(grid, cx + dx, cz + dz, h);

  for (let x = cx - r + 2; x <= cx + r - 3; x++) {
    grid.fillBox(x, 4, cz - r, x, 5, cz - r + 1, 'wood', 'structure');
    grid.fillBox(x, 4, cz + r - 1, x, 5, cz + r, 'wood', 'structure');
  }
  for (let z = cz - r + 2; z <= cz + r - 3; z++) {
    grid.fillBox(cx - r, 4, z, cx - r + 1, 5, z, 'wood', 'structure');
    grid.fillBox(cx + r - 1, 4, z, cx + r, 5, z, 'wood', 'structure');
  }

  for (let layer = 0; layer < 5; layer++) {
    const inset = layer;
    const y = h + 1 + layer;
    grid.fillBox(
      cx - r + inset, y, cz - r + inset,
      cx + r - 1 - inset, y, cz + r - 1 - inset,
      layer === 4 ? 'plank' : 'wood',
      'structure',
    );
  }

  lantern(grid, cx, cz, 2, h + 1);
}

function buildOuthouse(grid: VoxelGrid): void {
  const ix = 28;
  const iz = 16;
  const h = 11;
  grid.fillBox(ix, 1, iz, ix + 5, 1, iz + 5, 'wood', 'structure');
  grid.fillBox(ix, 2, iz, ix, h, iz + 5, 'wood', 'structure');
  grid.fillBox(ix + 5, 2, iz, ix + 5, h, iz + 5, 'wood', 'structure');
  grid.fillBox(ix, 2, iz, ix + 5, h, iz, 'wood', 'structure');
  grid.fillBox(ix, 2, iz + 5, ix + 1, h, iz + 5, 'wood', 'structure');
  grid.fillBox(ix + 4, 2, iz + 5, ix + 5, h, iz + 5, 'wood', 'structure');
  grid.fillBox(ix, h + 1, iz, ix + 5, h + 2, iz + 5, 'plank', 'structure');
  swingingDoor(grid, ix + 2, ix + 3, 2, h - 1, iz + 5, ix + 1, iz + 6, 'door-o');
}

function buildWell(grid: VoxelGrid): void {
  const cx = -22;
  const cz = 18;
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const d = Math.hypot(dx, dz);
      if (d >= 2.2 && d <= 3.4) grid.fillBox(cx + dx, 1, cz + dz, cx + dx, 4, cz + dz, 'rock', 'structure');
    }
  }
  post(grid, cx - 2, cz, 8);
  post(grid, cx + 1, cz, 8);
  grid.fillBox(cx - 2, 9, cz, cx + 2, 9, cz + 1, 'wood', 'structure');
}

function buildYardProps(grid: VoxelGrid): void {
  crate(grid, 18, 12, 1, 3);
  crate(grid, 21, 13, 1, 3);
  crate(grid, 19, 12, 4, 2);

  post(grid, 8, 14, 5);
  post(grid, 14, 14, 5);
  grid.fillBox(8, 5, 14, 15, 5, 15, 'wood', 'structure');
  grid.fillBox(8, 1, 16, 15, 2, 18, 'wood', 'structure');

  post(grid, -12, 14, 8);
  post(grid, -8, 14, 8);
  grid.fillBox(-12, 3, 15, -7, 8, 15, 'plank', 'structure');

  for (const x of [-18, -14, -10]) {
    post(grid, x, 22, 4);
    grid.fillBox(x, 3, 22, x + 3, 3, 23, 'wood', 'structure');
  }
}

/** Pórtico, coreto, casinha e o resto da praça. */
export function buildSaloon(): VoxelGrid {
  const grid = new VoxelGrid();

  pillar(grid, -16, -3);
  pillar(grid, -8, -3);
  pillar(grid, 6, -3);
  pillar(grid, 14, -3);

  grid.fillBox(-16, PILLAR_H + 1, -3, 16, PILLAR_H + 2, 1, 'adobe', 'structure');

  swingingDoor(grid, -5, 0, 2, 14, 0, -6, 0, 'door-l');
  swingingDoor(grid, 1, 6, 2, 14, 0, 7, 0, 'door-r');

  lantern(grid, -11, -1, 0, PILLAR_H + 1);
  lantern(grid, 11, -1, 1, PILLAR_H + 1);

  buildGazebo(grid);
  buildOuthouse(grid);
  buildWell(grid);
  buildYardProps(grid);

  cactus(grid, -28, 14, 10);
  cactus(grid, 24, 8, 12);
  cactus(grid, 32, -8, 8);
  rock(grid, -24, 6);
  rock(grid, 20, 4);
  rock(grid, -14, 20);

  return grid;
}

export const SALOON_PILLAR_HEIGHT = PILLAR_H;
