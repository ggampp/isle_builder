import * as THREE from 'three';
import { TOWN_PADS, heightAt } from './heightfield.ts';
import { createBuilding } from './buildings.ts';
import type { BuildingKind } from './buildings.ts';

export interface TownDef {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Recurso que a cidade exporta, usado nos contratos. */
  resource: string;
  resourceIcon: string;
  /** Verdadeiro para a cidade do outro lado do rio (exige ponte). */
  acrossRiver: boolean;
}

export const TOWNS: ReadonlyArray<TownDef> = [
  { id: 'pine', name: 'Pine Hollow', x: TOWN_PADS[0].x, z: TOWN_PADS[0].z, resource: 'Madeira', resourceIcon: '🪵', acrossRiver: false },
  { id: 'canyon', name: 'Canyon Town', x: TOWN_PADS[1].x, z: TOWN_PADS[1].z, resource: 'Pedra', resourceIcon: '🪨', acrossRiver: false },
  { id: 'copper', name: 'Copper Creek', x: TOWN_PADS[2].x, z: TOWN_PADS[2].z, resource: 'Cobre', resourceIcon: '🔶', acrossRiver: true },
];

/** Distância a partir da qual a linha conta como conectada à cidade. */
export const CONNECT_RADIUS = 26;

export function townById(id: string): TownDef | undefined {
  return TOWNS.find((t) => t.id === id);
}

interface TownBuilding {
  kind: BuildingKind;
  /** Deslocamento em relação ao centro da cidade. */
  dx: number;
  dz: number;
  rot: number;
  variant: number;
}

const LAYOUTS: Record<string, TownBuilding[]> = {
  pine: [
    { kind: 'house', dx: -12, dz: -9, rot: 0, variant: 0 },
    { kind: 'cottage', dx: -4, dz: -12, rot: 0.3, variant: 1 },
    { kind: 'cabin', dx: 7, dz: -10, rot: -0.2, variant: 2 },
    { kind: 'shed', dx: 14, dz: -3, rot: 1.5, variant: 0 },
    { kind: 'house', dx: -13, dz: 6, rot: 3.1, variant: 2 },
    { kind: 'cottage', dx: -3, dz: 11, rot: 3.3, variant: 0 },
    { kind: 'watertower', dx: 11, dz: 9, rot: 0, variant: 0 },
    { kind: 'lamp', dx: 0, dz: -3, rot: 0, variant: 0 },
    { kind: 'bench', dx: 4, dz: 2, rot: 0.6, variant: 0 },
  ],
  canyon: [
    { kind: 'manor', dx: -10, dz: -11, rot: 0.1, variant: 1 },
    { kind: 'house', dx: 2, dz: -13, rot: 0, variant: 0 },
    { kind: 'house', dx: 12, dz: -8, rot: -0.4, variant: 3 },
    { kind: 'shed', dx: -14, dz: 2, rot: 1.6, variant: 0 },
    { kind: 'cottage', dx: -6, dz: 10, rot: 3.0, variant: 2 },
    { kind: 'windmill', dx: 13, dz: 8, rot: 0.4, variant: 0 },
    { kind: 'lamp', dx: 3, dz: 0, rot: 0, variant: 0 },
    { kind: 'bench', dx: -2, dz: 4, rot: 2.4, variant: 0 },
  ],
  copper: [
    { kind: 'cabin', dx: -9, dz: -8, rot: 0.2, variant: 1 },
    { kind: 'cottage', dx: 3, dz: -10, rot: -0.3, variant: 2 },
    { kind: 'shed', dx: 11, dz: -2, rot: 1.4, variant: 0 },
    { kind: 'house', dx: -10, dz: 6, rot: 2.9, variant: 3 },
    { kind: 'watertower', dx: 9, dz: 9, rot: 0, variant: 0 },
    { kind: 'lamp', dx: 0, dz: 1, rot: 0, variant: 0 },
  ],
};

export interface TownScenery {
  group: THREE.Group;
  /** Partes que giram (pás do moinho). */
  spinners: THREE.Object3D[];
}

/** Constrói as casas de todas as cidades já existentes no mundo. */
export function buildTowns(): TownScenery {
  const group = new THREE.Group();
  const spinners: THREE.Object3D[] = [];
  for (const town of TOWNS) {
    for (const item of LAYOUTS[town.id] ?? []) {
      const mesh = createBuilding(item.kind, item.variant);
      const x = town.x + item.dx;
      const z = town.z + item.dz;
      mesh.position.set(x, heightAt(x, z) - 0.15, z);
      mesh.rotation.y = item.rot;
      mesh.traverse((obj) => {
        if (obj.userData.spin) spinners.push(obj);
      });
      group.add(mesh);
    }
  }
  return { group, spinners };
}

/** Placa flutuante com o nome da cidade, sempre virada para a câmera. */
export function buildTownLabels(): { group: THREE.Group; sprites: THREE.Sprite[] } {
  const group = new THREE.Group();
  const sprites: THREE.Sprite[] = [];
  for (const town of TOWNS) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.fillStyle = '#f6ead2';
    roundRect(ctx, 6, 6, 500, 116, 26);
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#4a3a26';
    ctx.font = 'bold 58px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(town.name, 256, 68);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.position.set(town.x, heightAt(town.x, town.z) + 13, town.z);
    sprite.scale.set(26, 6.5, 1);
    sprite.renderOrder = 5;
    group.add(sprite);
    sprites.push(sprite);
  }
  return { group, sprites };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number,
  w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
