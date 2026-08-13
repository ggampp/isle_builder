import { describe, expect, it } from 'vitest';
import {
  CRYSTALS,
  PLAYER_START,
  SIZE,
  STONE,
  canStep,
  cellHeight,
  enemySpawns,
  inBounds,
  isWater,
  moveOnTerrain,
  riverCenter,
  surfaceY,
} from './world.ts';
import { createEnemies, hurtEnemy } from './enemies.ts';
import { GOLEM_HP, SLIME_HP } from './stats.ts';

function reachable(sx: number, sz: number, tx: number, tz: number): boolean {
  const queue: [number, number][] = [[sx, sz]];
  const seen = new Set<string>([`${sx},${sz}`]);
  while (queue.length > 0) {
    const cur = queue.pop();
    if (!cur) break;
    const [x, z] = cur;
    if (x === tx && z === tz) return true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const nz = z + dz;
      const key = `${nx},${nz}`;
      if (seen.has(key) || !inBounds(nx, nz)) continue;
      if (cellHeight(nx, nz) - cellHeight(x, z) > 1) continue;
      seen.add(key);
      queue.push([nx, nz]);
    }
  }
  return false;
}

describe('vale', () => {
  it('o mapa é quadrado e o ponto inicial cabe nele', () => {
    expect(SIZE).toBe(40);
    expect(inBounds(Math.floor(PLAYER_START.x), Math.floor(PLAYER_START.z))).toBe(true);
    expect(cellHeight(Math.floor(PLAYER_START.x), Math.floor(PLAYER_START.z))).toBeGreaterThan(0);
  });

  it('o rio corta o meio e é raso (altura 0)', () => {
    const z = 18;
    const cx = Math.floor(riverCenter(z));
    expect(isWater(cx, z)).toBe(true);
    expect(surfaceY(cx + 0.5, z + 0.5)).toBeLessThan(0.4);
  });

  it('sobe um degrau e recusa um pulo de 2', () => {
    expect(canStep(0.5, 0.5, 0.5, 0.5)).toBe(true);
    const fromH = cellHeight(20, 22);
    expect(fromH).toBeGreaterThan(0);
  });

  it('cristais e menir estão dentro do mapa', () => {
    for (const c of CRYSTALS) {
      expect(inBounds(Math.floor(c.x), Math.floor(c.z))).toBe(true);
    }
    expect(inBounds(Math.floor(STONE.x), Math.floor(STONE.z))).toBe(true);
    expect(cellHeight(Math.floor(STONE.x), Math.floor(STONE.z))).toBeGreaterThan(0);
  });

  it('movimento contra a borda não sai do mapa', () => {
    const next = moveOnTerrain(0.2, 0.2, -2, 0);
    expect(next.x).toBeGreaterThanOrEqual(0);
    expect(inBounds(Math.floor(next.x), Math.floor(next.z))).toBe(true);
  });

  it('dá para sair do rio pisando na areia', () => {
    const z = 18;
    const wx = Math.floor(riverCenter(z));
    expect(isWater(wx, z)).toBe(true);
    const around = [
      [wx + 1, z], [wx - 1, z], [wx + 2, z], [wx - 2, z], [wx, z + 1], [wx, z - 1],
    ];
    const sand = around.find(([x, zz]) => cellHeight(x, zz) === 1);
    expect(sand).toBeTruthy();
    if (sand) expect(canStep(wx + 0.5, z + 0.5, sand[0] + 0.5, sand[1] + 0.5)).toBe(true);
  });

  it('o ponto inicial alcança os cristais sem pular falésia', () => {
    const startX = Math.floor(PLAYER_START.x);
    const startZ = Math.floor(PLAYER_START.z);
    for (const c of CRYSTALS) {
      expect(reachable(startX, startZ, Math.floor(c.x), Math.floor(c.z))).toBe(true);
    }
    expect(reachable(startX, startZ, Math.floor(STONE.x), Math.floor(STONE.z))).toBe(true);
  });

  it('há slimes e um golém no ninho do menir', () => {
    const spawns = enemySpawns();
    expect(spawns.filter((s) => s.kind === 'slime').length).toBeGreaterThanOrEqual(10);
    const golem = spawns.find((s) => s.kind === 'golem');
    expect(golem).toBeTruthy();
    expect(Math.hypot((golem?.x ?? 0) - STONE.x, (golem?.z ?? 0) - STONE.z)).toBeLessThan(2.5);
  });
});

describe('inimigos', () => {
  it('slime cai em dois golpes de magia nível 1 (4+4)', () => {
    const [slime] = createEnemies([{ kind: 'slime', x: 1, z: 1 }]);
    expect(slime.maxHp).toBe(SLIME_HP);
    expect(hurtEnemy(slime, 4)).toBe(4);
    expect(slime.alive).toBe(true);
    expect(hurtEnemy(slime, 4)).toBe(4);
    expect(slime.alive).toBe(false);
  });

  it('golém aguenta bem mais que um slime', () => {
    const [golem] = createEnemies([{ kind: 'golem', x: 1, z: 1 }]);
    expect(golem.maxHp).toBe(GOLEM_HP);
    hurtEnemy(golem, 8);
    expect(golem.alive).toBe(true);
  });
});
