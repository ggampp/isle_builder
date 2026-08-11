import * as THREE from 'three';
import { TILE_SIZE } from '../../world/constants.ts';
import type { PropDefinition } from '../../props/catalog.ts';
import type { PropAtlas } from './propsAtlas.ts';
import { PROP_CELL_PX } from './propsAtlas.ts';

/** World-space size for a prop sprite (may extend above footprint). */
export function propWorldSize(def: PropDefinition): { w: number; h: number } {
  const baseW = def.widthTiles * TILE_SIZE;
  const baseH = def.heightTiles * TILE_SIZE;

  switch (def.category) {
    case 'vegetation':
      return { w: baseW, h: Math.max(baseH, PROP_CELL_PX) };
    case 'decor':
      return { w: TILE_SIZE, h: TILE_SIZE * 1.5 };
    case 'building':
      return { w: baseW, h: Math.max(baseH, PROP_CELL_PX * (def.heightTiles / Math.max(1, def.widthTiles))) };
    case 'utility':
      return { w: baseW, h: Math.max(baseH, TILE_SIZE * 1.25) };
    default:
      return { w: baseW, h: def.heightTiles === 1 ? TILE_SIZE : baseH };
  }
}

/** Feet position (anchor) in world coords — bottom of the footprint. */
export function propFeetWorld(
  def: PropDefinition,
  tileX: number,
  tileY: number,
): { x: number; y: number } {
  const footprintW = def.widthTiles * TILE_SIZE;
  const footprintH = def.heightTiles * TILE_SIZE;
  return {
    x: tileX * TILE_SIZE + footprintW * def.anchorX,
    y: tileY * TILE_SIZE + footprintH * def.anchorY,
  };
}

/**
 * Material that samples one atlas cell via repeat/offset (matches UI thumbnail path).
 * Each material owns a cloned texture — call disposePropSpriteMaterial when done.
 */
export function createPropSpriteMaterial(
  def: PropDefinition,
  atlas: PropAtlas,
  extra?: Partial<THREE.MeshBasicMaterialParameters>,
): THREE.MeshBasicMaterial {
  const col = def.atlasIndex % atlas.cols;
  const row = Math.floor(def.atlasIndex / atlas.cols);
  const map = atlas.texture.clone();
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.repeat.set(1 / atlas.cols, 1 / atlas.rows);
  // CanvasTexture flipY=true: canvas row 0 is at the top (v→1).
  map.offset.set(col / atlas.cols, (atlas.rows - 1 - row) / atlas.rows);
  map.needsUpdate = true;

  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    alphaTest: 0.01,
    ...extra,
  });
}

export function disposePropSpriteMaterial(material: THREE.Material): void {
  if (material instanceof THREE.MeshBasicMaterial && material.map) {
    material.map.dispose();
  }
  material.dispose();
}
