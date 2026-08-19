import type { BUILD_HP, COSTS, FOOTPRINT } from './config.ts';

export type BuildKind = keyof typeof COSTS;
export type Facing = 'se' | 'sw' | 'ne' | 'nw';
export type Anim = 'idle' | 'walk' | 'attack' | 'chop' | 'repair';
export type UnitKind = 'hero' | 'worker' | 'soldier' | 'pet' | 'wolf' | 'slime' | 'brute';
export type NodeKind = 'tree' | 'rock' | 'crystal';
export type Job = 'idle' | 'chop' | 'repair' | 'patrol' | 'defend' | 'train' | 'follow' | 'attack';

export interface Stock {
  wood: number;
  stone: number;
  gold: number;
  food: number;
}

export interface TileNode {
  kind: NodeKind;
  hp: number;
  maxHp: number;
}

export interface Building {
  id: number;
  kind: BuildKind;
  gx: number;
  gy: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  trainLeft: number;
  lastHitAt: number;
}

export interface Actor {
  id: number;
  kind: UnitKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: Facing;
  anim: Anim;
  animT: number;
  moving: boolean;
  job: Job;
  targetId: number | null;
  targetX: number;
  targetY: number;
  attackCd: number;
  patrolI: number;
  homeX: number;
  homeY: number;
  chopResume: { x: number; y: number } | null;
}

export interface Hero extends Actor {
  kind: 'hero';
  mp: number;
  maxMp: number;
  level: number;
  xp: number;
  repairTarget: number | null;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  damage: number;
  from: 'tower' | 'hero';
  life: number;
}

export interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: 'dmg' | 'heal' | 'loot' | 'xp';
  age: number;
}

export interface World {
  time: number;
  seed: number;
  nextId: number;
  tiles: (TileNode | null)[][];
  occ: (number | 0)[][];
  buildings: Building[];
  units: Actor[];
  hero: Hero;
  pet: Actor;
  stock: Stock;
  projectiles: Projectile[];
  floaters: Floater[];
  logs: string[];
  wave: number;
  waveIn: number;
  underAttackUntil: number;
  popCap: number;
  selected: BuildKind | null;
  moveGoal: { x: number; y: number } | null;
  killed: number;
  won: boolean;
}

export type Footprint = (typeof FOOTPRINT)[BuildKind];
export type BuildHp = (typeof BUILD_HP)[BuildKind];
