/** Fórmulas de RPG. Puras: nada de DOM, nada de Three. */

export const MAGIC_COST = 2;
export const MAGIC_RADIUS = 1.55;
export const MELEE_DAMAGE = 2;
export const MELEE_RANGE = 1.05;
export const ATTACK_COOLDOWN = 0.42;
export const CONTACT_COOLDOWN = 0.7;
export const CRYSTAL_HEAL = 10;
export const CRYSTAL_RADIUS = 1.45;
export const CRYSTAL_COOLDOWN = 1.8;
export const SLIME_HP = 8;
export const GOLEM_HP = 22;
export const SLIME_XP = 8;
export const GOLEM_XP = 22;
export const SLIME_TOUCH = 1;
export const GOLEM_TOUCH = 2;
export const PLAYER_SPEED = 3.55;
export const SLIME_SPEED = 1.35;
export const GOLEM_SPEED = 0.85;
export const CHASE_RANGE = 5.4;
export const SLIME_RESPAWN = 16;
export const GOLEM_RESPAWN = 42;
export const MAX_LEVEL = 8;

export function maxHp(level: number): number {
  return 10 + (level - 1) * 6;
}

export function maxMp(level: number): number {
  return 10 + (level - 1) * 2;
}

export function xpToNext(level: number): number {
  return 20 + (level - 1) * 12;
}

/** Dano da magia cresce com o nível — o ponto do tweet. */
export function magicDamage(level: number): number {
  return 4 + (level - 1) * 2;
}

export function enemyHp(kind: 'slime' | 'golem'): number {
  return kind === 'golem' ? GOLEM_HP : SLIME_HP;
}

export function enemyXp(kind: 'slime' | 'golem'): number {
  return kind === 'golem' ? GOLEM_XP : SLIME_XP;
}

export function enemyTouch(kind: 'slime' | 'golem'): number {
  return kind === 'golem' ? GOLEM_TOUCH : SLIME_TOUCH;
}
