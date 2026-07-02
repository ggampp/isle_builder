export const EntityKind = {
  Villager: 0,
  Fish: 1,
  Whale: 2,
  Shark: 3,
  Orca: 4,
  Swordfish: 5,
  Rowboat: 6,
  Galleon: 7,
} as const;

export type EntityKindValue = (typeof EntityKind)[keyof typeof EntityKind];

export const VillagerDir = {
  South: 0,
  North: 1,
  East: 2,
  West: 3,
} as const;

export type VillagerDirValue = (typeof VillagerDir)[keyof typeof VillagerDir];

export interface VillagerAgent {
  x: number;
  y: number;
  dir: VillagerDirValue;
  variant: number;
  animPhase: number;
  state: 'idle' | 'walk';
  pauseLeft: number;
  targetX: number;
  targetY: number;
  landComponent: number;
}

export interface FishAgent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  animPhase: number;
  shallow: boolean;
}

export interface MarineAgent {
  kind: typeof EntityKind.Whale | typeof EntityKind.Shark | typeof EntityKind.Orca | typeof EntityKind.Swordfish;
  x: number;
  y: number;
  angle: number;
  speed: number;
  animPhase: number;
  sprayCooldown: number;
}

export interface ShipAgent {
  kind: typeof EntityKind.Rowboat | typeof EntityKind.Galleon;
  x: number;
  y: number;
  angle: number;
  speed: number;
  animPhase: number;
  wakePhase: number;
}
