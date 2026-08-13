export const VOXEL_SIZE = 0.12;

export const MAT_IDS = [
  'wood', 'plank', 'adobe', 'steel', 'hinge', 'lantern', 'cactus', 'rock',
] as const;

export type MatId = (typeof MAT_IDS)[number];

export interface MaterialDef {
  hp: number;
  density: number;
  color: number;
  roughness: number;
  metalness: number;
  emissive: number;
  emissiveIntensity: number;
}

export const MATERIALS: Record<MatId, MaterialDef> = {
  wood:    { hp: 7,  density: 0.7, color: 0x8d5a32, roughness: 0.88, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
  plank:   { hp: 5,  density: 0.6, color: 0xb07a48, roughness: 0.82, metalness: 0.02, emissive: 0x000000, emissiveIntensity: 0 },
  adobe:   { hp: 10, density: 1.7, color: 0xc8a57a, roughness: 0.94, metalness: 0.00, emissive: 0x000000, emissiveIntensity: 0 },
  steel:   { hp: 26, density: 3.8, color: 0x4e545c, roughness: 0.38, metalness: 0.82, emissive: 0x000000, emissiveIntensity: 0 },
  hinge:   { hp: 20, density: 3.6, color: 0x2f333a, roughness: 0.42, metalness: 0.88, emissive: 0x000000, emissiveIntensity: 0 },
  lantern: { hp: 4,  density: 0.9, color: 0xffc14a, roughness: 0.28, metalness: 0.15, emissive: 0xff9a2a, emissiveIntensity: 2.4 },
  cactus:  { hp: 8,  density: 0.8, color: 0x3f8a4a, roughness: 0.9,  metalness: 0.00, emissive: 0x000000, emissiveIntensity: 0 },
  rock:    { hp: 18, density: 2.2, color: 0x7a6a58, roughness: 0.96, metalness: 0.04, emissive: 0x000000, emissiveIntensity: 0 },
};

export const DOOR_GROUPS = ['door-l', 'door-r', 'door-o'] as const;
export type DoorGroup = (typeof DOOR_GROUPS)[number];

export type VoxelGroup =
  | 'structure'
  | DoorGroup
  | 'chain-0'
  | 'chain-1'
  | 'chain-2'
  | 'chain-3'
  | 'lantern-0'
  | 'lantern-1'
  | 'lantern-2'
  | 'lantern-3';

export interface Voxel {
  id: number;
  ix: number;
  iy: number;
  iz: number;
  mat: MatId;
  hp: number;
  group: VoxelGroup;
}

export function voxelKey(ix: number, iy: number, iz: number): string {
  return `${ix},${iy},${iz}`;
}

export function worldCenter(ix: number, iy: number, iz: number): { x: number; y: number; z: number } {
  return {
    x: ix * VOXEL_SIZE,
    y: iy * VOXEL_SIZE + VOXEL_SIZE * 0.5,
    z: iz * VOXEL_SIZE,
  };
}
