import type { Hero } from './hero.ts';
import {
  ATTACK_COOLDOWN,
  CRYSTAL_HEAL,
  MAGIC_COST,
  MAGIC_RADIUS,
  MAX_LEVEL,
  MELEE_DAMAGE,
  MELEE_RANGE,
  magicDamage,
  maxHp,
  maxMp,
  xpToNext,
} from './stats.ts';

export type AttackKind = 'magic' | 'melee';

export interface Attack {
  kind: AttackKind;
  damage: number;
  radius: number;
  mpSpent: number;
}

export interface LevelUp {
  leveled: boolean;
  from: number;
  to: number;
  hpGained: number;
}

export function tryAttack(hero: Hero): Attack | null {
  if (!hero.alive || hero.attackCooldown > 0) return null;
  hero.attackCooldown = ATTACK_COOLDOWN;
  if (hero.mp >= MAGIC_COST) {
    hero.mp -= MAGIC_COST;
    return {
      kind: 'magic',
      damage: magicDamage(hero.level),
      radius: MAGIC_RADIUS,
      mpSpent: MAGIC_COST,
    };
  }
  return {
    kind: 'melee',
    damage: MELEE_DAMAGE,
    radius: MELEE_RANGE,
    mpSpent: 0,
  };
}

export function hitHero(hero: Hero, amount: number): number {
  if (!hero.alive || hero.hurtCooldown > 0 || amount <= 0) return 0;
  const dealt = Math.min(hero.hp, amount);
  hero.hp -= dealt;
  hero.hurtCooldown = 0.55;
  if (hero.hp <= 0) {
    hero.hp = 0;
    hero.alive = false;
  }
  return dealt;
}

export function healHero(hero: Hero, amount: number): number {
  if (!hero.alive || amount <= 0) return 0;
  const before = hero.hp;
  hero.hp = Math.min(hero.maxHp, hero.hp + amount);
  return hero.hp - before;
}

export function restoreAtCrystal(hero: Hero): { hp: number; mp: number } | null {
  if (!hero.alive || hero.crystalCooldown > 0) return null;
  const hp = healHero(hero, CRYSTAL_HEAL);
  const mpBefore = hero.mp;
  hero.mp = hero.maxMp;
  hero.crystalCooldown = 1.8;
  return { hp, mp: hero.mp - mpBefore };
}

export function grantXp(hero: Hero, amount: number): LevelUp {
  const from = hero.level;
  if (!hero.alive || amount <= 0) {
    return { leveled: false, from, to: from, hpGained: 0 };
  }
  hero.xp += amount;
  let hpGained = 0;
  while (hero.level < MAX_LEVEL && hero.xp >= xpToNext(hero.level)) {
    hero.xp -= xpToNext(hero.level);
    hero.level += 1;
    const nextHp = maxHp(hero.level);
    hpGained += nextHp - hero.maxHp;
    hero.maxHp = nextHp;
    hero.maxMp = maxMp(hero.level);
    hero.hp = hero.maxHp;
    hero.mp = hero.maxMp;
  }
  if (hero.level >= MAX_LEVEL) hero.xp = 0;
  return {
    leveled: hero.level > from,
    from,
    to: hero.level,
    hpGained,
  };
}

export function inRadius(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  radius: number,
): boolean {
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz <= radius * radius;
}
