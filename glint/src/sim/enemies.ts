import { inRadius } from './combat.ts';
import {
  CHASE_RANGE,
  GOLEM_RESPAWN,
  GOLEM_SPEED,
  SLIME_RESPAWN,
  SLIME_SPEED,
  enemyHp,
} from './stats.ts';
import { moveOnTerrain, type Spawn } from './world.ts';

export interface Enemy {
  id: number;
  kind: 'slime' | 'golem';
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  homeX: number;
  homeZ: number;
  vx: number;
  vz: number;
  wanderT: number;
  hurtT: number;
  alive: boolean;
  respawnIn: number;
}

export function createEnemies(spawns: Spawn[]): Enemy[] {
  return spawns.map((spawn, id) => {
    const hp = enemyHp(spawn.kind);
    return {
      id,
      kind: spawn.kind,
      x: spawn.x,
      z: spawn.z,
      hp,
      maxHp: hp,
      homeX: spawn.x,
      homeZ: spawn.z,
      vx: 0,
      vz: 0,
      wanderT: 0.4 + id * 0.17,
      hurtT: 0,
      alive: true,
      respawnIn: 0,
    };
  });
}

export function hurtEnemy(enemy: Enemy, damage: number): number {
  if (!enemy.alive || damage <= 0) return 0;
  const dealt = Math.min(enemy.hp, damage);
  enemy.hp -= dealt;
  enemy.hurtT = 0.22;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.alive = false;
    enemy.respawnIn = enemy.kind === 'golem' ? GOLEM_RESPAWN : SLIME_RESPAWN;
  }
  return dealt;
}

export function tickEnemy(
  enemy: Enemy,
  dt: number,
  playerX: number,
  playerZ: number,
  playerAlive: boolean,
): void {
  enemy.hurtT = Math.max(0, enemy.hurtT - dt);
  if (!enemy.alive) {
    enemy.respawnIn -= dt;
    if (enemy.respawnIn <= 0) {
      enemy.alive = true;
      enemy.hp = enemy.maxHp;
      enemy.x = enemy.homeX;
      enemy.z = enemy.homeZ;
    }
    return;
  }

  enemy.wanderT -= dt;
  const distHome = Math.hypot(playerX - enemy.x, playerZ - enemy.z);
  const speed = enemy.kind === 'golem' ? GOLEM_SPEED : SLIME_SPEED;
  let dirX = 0;
  let dirZ = 0;

  if (playerAlive && distHome < CHASE_RANGE) {
    dirX = playerX - enemy.x;
    dirZ = playerZ - enemy.z;
  } else if (enemy.wanderT <= 0) {
    const angle = (enemy.id * 1.7 + enemy.x + enemy.z) % (Math.PI * 2);
    enemy.vx = Math.cos(angle + enemy.wanderT);
    enemy.vz = Math.sin(angle * 1.3);
    enemy.wanderT = 1.4 + (enemy.id % 5) * 0.35;
    dirX = enemy.vx;
    dirZ = enemy.vz;
  } else {
    dirX = enemy.vx;
    dirZ = enemy.vz;
  }

  const len = Math.hypot(dirX, dirZ);
  if (len < 0.05) return;
  const nx = (dirX / len) * speed * dt;
  const nz = (dirZ / len) * speed * dt;
  const next = moveOnTerrain(enemy.x, enemy.z, nx, nz, enemy.kind === 'golem' ? 0.4 : 0.26);
  enemy.x = next.x;
  enemy.z = next.z;
  if (playerAlive && distHome >= CHASE_RANGE) {
    enemy.vx = dirX / len;
    enemy.vz = dirZ / len;
  }
}

export function touching(enemy: Enemy, x: number, z: number): boolean {
  const reach = enemy.kind === 'golem' ? 0.95 : 0.72;
  return enemy.alive && inRadius(enemy.x, enemy.z, x, z, reach);
}
