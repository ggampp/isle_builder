import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  normalizeModelToHeight,
  cloneBuildingModel,
  hasBuildingModel,
  _resetModelCacheForTests,
  _setBuildingModelForTests,
} from './modelLoader.ts';
import { createBuilding } from '../world/buildings.ts';

describe('modelLoader', () => {
  beforeEach(() => {
    _resetModelCacheForTests();
  });

  it('normalizeModelToHeight scales and seats the pivot on the ground', () => {
    const root = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2));
    mesh.position.y = 10; // floating box — base should land at y=0 after normalize
    root.add(mesh);

    normalizeModelToHeight(root, 8);

    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    expect(box.min.y).toBeCloseTo(0, 4);
    expect(box.max.y - box.min.y).toBeCloseTo(8, 4);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 4);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 4);
  });

  it('createBuilding uses cached GLB when available', () => {
    const template = new THREE.Group();
    template.name = 'model:watertower';
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    marker.name = 'glb-marker';
    template.add(marker);
    _setBuildingModelForTests('watertower', template);

    expect(hasBuildingModel('watertower')).toBe(true);
    const built = createBuilding('watertower');
    expect(built.getObjectByName('glb-marker')).toBeTruthy();

    const clone = cloneBuildingModel('watertower');
    expect(clone).not.toBeNull();
    expect(clone).not.toBe(template);
  });

  it('createBuilding falls back to procedural when no GLB is cached', () => {
    expect(hasBuildingModel('watertower')).toBe(false);
    const built = createBuilding('watertower');
    // Procedural tower has several meshes (legs + tank + cap).
    let meshes = 0;
    built.traverse((o) => {
      if (o instanceof THREE.Mesh) meshes += 1;
    });
    expect(meshes).toBeGreaterThanOrEqual(5);
  });

  it('createBuilding prefers house GLB when cached', () => {
    const template = new THREE.Group();
    template.name = 'model:house';
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    marker.name = 'house-glb';
    template.add(marker);
    _setBuildingModelForTests('house', template);

    const built = createBuilding('house');
    expect(built.getObjectByName('house-glb')).toBeTruthy();
  });
});
