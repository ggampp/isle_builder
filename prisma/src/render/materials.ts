import { BLUE, RED, YELLOW } from '../puzzle/colors.ts';
import type { ColorMask } from '../puzzle/colors.ts';
import * as THREE from 'three';

export const CELL = 1.12;
export const BEAM_Y = 0.42;

export function colorThree(mask: ColorMask): THREE.Color {
  const map: Record<number, string> = {
    [RED]: '#e8544a',
    [YELLOW]: '#efc133',
    [RED | YELLOW]: '#f0872c',
    [BLUE]: '#3d8ee8',
    [RED | BLUE]: '#a95ce0',
    [YELLOW | BLUE]: '#49b862',
    [RED | YELLOW | BLUE]: '#eef1f6',
  };
  return new THREE.Color(map[mask & 7] ?? '#4a4f5a');
}

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${path.replace(/^\//, '')}`;
}

export class MaterialLibrary {
  slate: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  obsidian: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  marble: THREE.MeshStandardMaterial;
  emissive: THREE.MeshStandardMaterial;
  beam: THREE.MeshBasicMaterial;
  hover: THREE.MeshBasicMaterial;
  table: THREE.MeshStandardMaterial;
  goldTrim: THREE.MeshStandardMaterial;

  constructor() {
    this.slate = new THREE.MeshStandardMaterial({
      color: '#1c222d',
      roughness: 0.62,
      metalness: 0.18,
    });
    this.brass = new THREE.MeshStandardMaterial({
      color: '#c4a35a',
      roughness: 0.35,
      metalness: 0.82,
    });
    this.obsidian = new THREE.MeshStandardMaterial({
      color: '#3a4150',
      roughness: 0.28,
      metalness: 0.45,
    });
    this.glass = new THREE.MeshPhysicalMaterial({
      color: '#d7e7ff',
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.72,
      thickness: 0.35,
      transparent: true,
      opacity: 0.85,
    });
    this.marble = new THREE.MeshStandardMaterial({
      color: '#161b24',
      roughness: 0.55,
      metalness: 0.12,
    });
    this.emissive = new THREE.MeshStandardMaterial({
      color: '#fff4d6',
      emissive: '#ffd27a',
      emissiveIntensity: 1.4,
      roughness: 0.4,
    });
    this.beam = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.hover = new THREE.MeshBasicMaterial({
      color: '#7ec8ff',
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    this.table = new THREE.MeshStandardMaterial({
      color: '#12161e',
      roughness: 0.48,
      metalness: 0.22,
    });
    this.goldTrim = new THREE.MeshStandardMaterial({
      color: '#8a7040',
      roughness: 0.42,
      metalness: 0.7,
    });
  }

  applySlateMap(map: THREE.Texture): void {
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(6, 6);
    this.marble.map = map;
    this.marble.needsUpdate = true;
  }

  tintedEmissive(mask: ColorMask): THREE.MeshStandardMaterial {
    const color = colorThree(mask);
    const mat = this.emissive.clone();
    mat.color = color.clone().lerp(new THREE.Color('#ffffff'), 0.25);
    mat.emissive = color;
    mat.emissiveIntensity = 1.6;
    return mat;
  }
}
