/** Números fixos do keep. Puros: nada de DOM. */

export const MAP_W = 42;
export const MAP_H = 42;

export const HERO_SPEED = 4.2;
export const WORKER_SPEED = 2.6;
export const SOLDIER_SPEED = 3.1;
export const PET_SPEED = 4.6;
export const WOLF_SPEED = 2.4;
export const SLIME_SPEED = 1.7;
export const BRUTE_SPEED = 1.35;

export const MINE_RANGE = 1.15;
export const MINE_DAMAGE = 8;
export const MINE_COOLDOWN = 0.38;
export const MAGIC_COST = 6;
export const MAGIC_DAMAGE = 22;
export const MAGIC_COOLDOWN = 0.55;
export const MAGIC_RANGE = 7.2;
export const HERO_MELEE_DAMAGE = 12;
export const HERO_MELEE_RANGE = 1.05;

export const REPAIR_THRESHOLD = 0.5;
export const REPAIR_RESUME = 0.8;
export const WORKER_REPAIR_RATE = 36;
export const HERO_REPAIR_RATE = 52;
export const REPAIR_RANGE = 1.25;

export const ATTACK_MEMORY = 4;
export const TRAIN_WORKER_TIME = 8;
export const WAVE_PERIOD = 22;
export const FIRST_WAVE = 16;

export const TOWER_RANGE = 6.5;
export const TOWER_DAMAGE = 14;
export const TOWER_COOLDOWN = 0.7;
export const TOWER_PROJ_SPEED = 11;

export const PET_DAMAGE = 6;
export const PET_RANGE = 1.1;
export const PET_COOLDOWN = 0.55;

export const CONTACT_COOLDOWN = 0.7;
export const XP_PER_KILL = 9;
export const MAX_LEVEL = 12;

export const START_WOOD = 90;
export const START_STONE = 55;
export const START_GOLD = 8;
export const START_FOOD = 24;

export const COSTS = {
  wall: { wood: 8, stone: 0 },
  tower: { wood: 28, stone: 12 },
  house: { wood: 36, stone: 18 },
  fortress: { wood: 80, stone: 55 },
} as const;

export const FOOTPRINT = {
  wall: { w: 1, h: 1 },
  tower: { w: 1, h: 1 },
  house: { w: 2, h: 2 },
  fortress: { w: 3, h: 3 },
} as const;

export const BUILD_HP = {
  wall: 220,
  tower: 280,
  house: 200,
  fortress: 560,
} as const;

export const UNIT_HP = {
  hero: 80,
  worker: 42,
  soldier: 74,
  pet: 48,
  wolf: 28,
  slime: 16,
  brute: 96,
} as const;

export const UNIT_DAMAGE = {
  worker: 4,
  soldier: 9,
  wolf: 7,
  slime: 4,
  brute: 16,
} as const;

export const NODE_HP = {
  tree: 28,
  rock: 36,
  crystal: 22,
} as const;

export const NODE_YIELD = {
  tree: { wood: 6, stone: 0, gold: 0, food: 0 },
  rock: { wood: 0, stone: 5, gold: 0, food: 0 },
  crystal: { wood: 0, stone: 0, gold: 3, food: 0 },
} as const;

export const POP_PER_HOUSE = 3;
export const BASE_POP_CAP = 6;

export function maxHp(level: number): number {
  return UNIT_HP.hero + (level - 1) * 10;
}

export function maxMp(level: number): number {
  return 40 + (level - 1) * 6;
}

export function xpToNext(level: number): number {
  return 28 + (level - 1) * 16;
}

export function pickaxeDamage(level: number): number {
  return MINE_DAMAGE + (level - 1) * 2;
}

export function meleeDamage(level: number): number {
  return HERO_MELEE_DAMAGE + (level - 1) * 2;
}
