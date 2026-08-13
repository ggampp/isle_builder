import { maxHp, maxMp } from './stats.ts';

export interface Hero {
  x: number;
  z: number;
  facingX: number;
  facingZ: number;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  xp: number;
  attackCooldown: number;
  hurtCooldown: number;
  crystalCooldown: number;
  alive: boolean;
}

export function createHero(x: number, z: number): Hero {
  const level = 1;
  const hp = maxHp(level);
  const mp = maxMp(level);
  return {
    x,
    z,
    facingX: 0,
    facingZ: -1,
    level,
    hp,
    maxHp: hp,
    mp,
    maxMp: mp,
    xp: 0,
    attackCooldown: 0,
    hurtCooldown: 0,
    crystalCooldown: 0,
    alive: true,
  };
}

export function tickHero(hero: Hero, dt: number): void {
  hero.attackCooldown = Math.max(0, hero.attackCooldown - dt);
  hero.hurtCooldown = Math.max(0, hero.hurtCooldown - dt);
  hero.crystalCooldown = Math.max(0, hero.crystalCooldown - dt);
}
