import * as THREE from 'three';
import { heightAt } from './heightfield.ts';
import { createBuilding } from './buildings.ts';
import type { BuildingKind } from './buildings.ts';
import type { TownBuilding, TownDef } from './maps.ts';
import { WORLD_MAPS } from './maps.ts';

export type { TownDef };

const defaultWorld = WORLD_MAPS[0]!;

/** Cidades do mapa ativo — live binding para imports existentes. */
export let TOWNS: ReadonlyArray<TownDef> = defaultWorld.towns;

let layouts: Readonly<Record<string, TownBuilding[]>> = defaultWorld.layouts;

/** Distância a partir da qual a linha conta como conectada à cidade. */
export const CONNECT_RADIUS = 26;

export function setWorldTowns(
  towns: readonly TownDef[],
  nextLayouts: Readonly<Record<string, TownBuilding[]>>,
): void {
  TOWNS = towns;
  layouts = nextLayouts;
}

export function townById(id: string): TownDef | undefined {
  return TOWNS.find((t) => t.id === id);
}

export interface TownScenery {
  group: THREE.Group;
  spinners: THREE.Object3D[];
}

/** Constrói as casas de todas as cidades do mapa ativo. */
export function buildTowns(): TownScenery {
  const group = new THREE.Group();
  const spinners: THREE.Object3D[] = [];
  for (const town of TOWNS) {
    for (const item of layouts[town.id] ?? []) {
      const mesh = createBuilding(item.kind as BuildingKind, item.variant);
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

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
