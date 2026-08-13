/** Vale em blocos: altura inteira por célula, rio raso, platôs e cristais. */

export const SIZE = 40;
export const HEIGHT_SCALE = 0.52;
export const STEP_LIMIT = 1;

export interface Crystal {
  x: number;
  z: number;
}

export const PLAYER_START = { x: 20.5, z: 22.5 };
export const STONE = { x: 20.5, z: 33.5 };

export const CRYSTALS: Crystal[] = [
  { x: 31.2, z: 13.6 },
  { x: 8.4, z: 17.8 },
  { x: 21.6, z: 6.4 },
];

export const FLOWERS: { x: number; z: number }[] = [
  { x: 16.5, z: 20.2 },
  { x: 24.8, z: 19.4 },
  { x: 18.2, z: 27.6 },
  { x: 12.4, z: 11.2 },
];

export function inBounds(cx: number, cz: number): boolean {
  return cx >= 0 && cz >= 0 && cx < SIZE && cz < SIZE;
}

export function riverCenter(z: number): number {
  return 19.6 + Math.sin(z * 0.21) * 3.35 + Math.sin(z * 0.07 + 1.1) * 1.55;
}

export function cellHeight(cx: number, cz: number): number {
  if (!inBounds(cx, cz)) return 0;

  const riverX = riverCenter(cz);
  const distRiver = Math.abs(cx + 0.5 - riverX);

  let h = 2;
  if (cx < 8) h = cx < 4 ? 4 : 3;
  if (cx > 31) h = cx > 35 ? 4 : 3;
  if (cz < 5) h = Math.max(h, 4);
  if (cz > 35) h = Math.max(h, 3);

  const westMound = Math.hypot(cx - 9, cz - 16);
  if (westMound < 4.2) h = Math.max(h, westMound < 2.1 ? 4 : 3);

  const eastRock = Math.hypot(cx - 30.5, cz - 12.5);
  if (eastRock < 3.6) h = Math.max(h, eastRock < 1.8 ? 5 : 4);

  const northBluff = Math.hypot(cx - 14, cz - 8);
  if (northBluff < 3.4) h = Math.max(h, 4);

  const isle = Math.hypot(cx - 20.5, cz - 33.2);
  if (isle < 3.4) h = 2;
  if (isle < 1.35) h = 3;

  const gorge = cz > 3 && cz < 31;
  if (gorge && distRiver < 1.85) h = 0;
  else if (gorge && distRiver < 2.75) h = Math.min(h, 1);

  if (cz <= 6) {
    const pool = Math.hypot(cx + 0.5 - riverX, cz - 3.2);
    if (pool < 3.4) h = cz <= 3 ? 0 : Math.min(h, cz <= 4 ? 1 : h);
  }

  return h;
}

export function surfaceY(x: number, z: number): number {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  const h = cellHeight(cx, cz);
  if (h <= 0) return 0.22;
  return h * HEIGHT_SCALE;
}

export function isWater(cx: number, cz: number): boolean {
  return cellHeight(cx, cz) <= 0;
}

export function isSand(cx: number, cz: number): boolean {
  return cellHeight(cx, cz) === 1;
}

export function canStand(x: number, z: number): boolean {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  return inBounds(cx, cz);
}

export function canStep(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
  if (!canStand(toX, toZ)) return false;
  const fromH = cellHeight(Math.floor(fromX), Math.floor(fromZ));
  const toH = cellHeight(Math.floor(toX), Math.floor(toZ));
  return toH - fromH <= STEP_LIMIT;
}

export function moveOnTerrain(
  x: number,
  z: number,
  dx: number,
  dz: number,
  radius = 0.28,
): { x: number; z: number } {
  const tryX = x + dx;
  const tryZ = z + dz;
  if (fits(tryX, tryZ, radius) && canStep(x, z, tryX, tryZ)) return { x: tryX, z: tryZ };
  if (fits(tryX, z, radius) && canStep(x, z, tryX, z)) return { x: tryX, z };
  if (fits(x, tryZ, radius) && canStep(x, z, x, tryZ)) return { x, z: tryZ };
  return { x, z };
}

function fits(x: number, z: number, radius: number): boolean {
  const samples: [number, number][] = [
    [x, z],
    [x + radius, z],
    [x - radius, z],
    [x, z + radius],
    [x, z - radius],
  ];
  for (const [sx, sz] of samples) {
    if (!canStand(sx, sz)) return false;
  }
  return true;
}

export interface Spawn {
  kind: 'slime' | 'golem';
  x: number;
  z: number;
}

export function enemySpawns(): Spawn[] {
  return [
    { kind: 'slime', x: 17.4, z: 18.6 },
    { kind: 'slime', x: 23.8, z: 17.2 },
    { kind: 'slime', x: 19.2, z: 14.4 },
    { kind: 'slime', x: 26.5, z: 21.8 },
    { kind: 'slime', x: 14.6, z: 21.2 },
    { kind: 'slime', x: 22.4, z: 10.8 },
    { kind: 'slime', x: 16.8, z: 9.6 },
    { kind: 'slime', x: 28.2, z: 16.4 },
    { kind: 'slime', x: 11.5, z: 14.8 },
    { kind: 'slime', x: 24.6, z: 26.5 },
    { kind: 'slime', x: 18.4, z: 28.8 },
    { kind: 'slime', x: 15.2, z: 25.4 },
    { kind: 'golem', x: 20.5, z: 32.2 },
  ];
}
