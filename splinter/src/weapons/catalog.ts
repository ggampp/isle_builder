export type WeaponId = 'bullet' | 'shotgun' | 'rifle' | 'bomb' | 'laser';

export interface WeaponDef {
  id: WeaponId;
  slot: 1 | 2 | 3 | 4 | 5;
  label: string;
  pellets: number;
  spread: number;
  damage: number;
  radius: number;
  impulse: number;
  range: number;
  cooldown: number;
  throw: boolean;
  beam: boolean;
}

export const WEAPONS: readonly WeaponDef[] = [
  { id: 'bullet',  slot: 1, label: 'Bullet',      pellets: 1, spread: 0.012, damage: 12, radius: 0.14, impulse: 3.2,  range: 42, cooldown: 0.28, throw: false, beam: false },
  { id: 'shotgun', slot: 2, label: 'Shotgun',     pellets: 8, spread: 0.08,  damage: 14, radius: 0.20, impulse: 6.2,  range: 20, cooldown: 0.72, throw: false, beam: false },
  { id: 'rifle',   slot: 3, label: 'Lever Rifle', pellets: 1, spread: 0.008, damage: 22, radius: 0.24, impulse: 9.0,  range: 56, cooldown: 0.55, throw: false, beam: false },
  { id: 'bomb',    slot: 4, label: 'Bomb',        pellets: 1, spread: 0,     damage: 48, radius: 1.55, impulse: 16,   range: 18, cooldown: 1.35, throw: true,  beam: false },
  { id: 'laser',   slot: 5, label: 'Laser',       pellets: 1, spread: 0.002, damage: 7,  radius: 0.13, impulse: 0.8,  range: 34, cooldown: 0.05, throw: false, beam: true },
];

export function weaponBySlot(slot: number): WeaponDef | undefined {
  return WEAPONS.find((w) => w.slot === slot);
}

export function weaponById(id: WeaponId): WeaponDef {
  const w = WEAPONS.find((item) => item.id === id);
  if (!w) throw new Error(`arma desconhecida: ${id}`);
  return w;
}

export function spreadDirection(
  dir: { x: number; y: number; z: number },
  spread: number,
  rand: () => number = Math.random,
): { x: number; y: number; z: number } {
  if (spread <= 0) return { x: dir.x, y: dir.y, z: dir.z };
  const ox = (rand() * 2 - 1) * spread;
  const oy = (rand() * 2 - 1) * spread;
  const oz = (rand() * 2 - 1) * spread;
  const x = dir.x + ox;
  const y = dir.y + oy;
  const z = dir.z + oz;
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}
