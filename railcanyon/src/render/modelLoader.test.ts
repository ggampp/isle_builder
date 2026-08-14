import { describe, expect, it, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  normalizeModelToHeight,
  toGameMaterial,
  cloneBuildingModel,
  cloneTrainModel,
  hasBuildingModel,
  hasTrainModel,
  _resetModelCacheForTests,
  _setBuildingModelForTests,
  _setTrainModelForTests,
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

  it('toGameMaterial converts metallic PBR into Lambert so the mesh stays lit', () => {
    const pbr = new THREE.MeshStandardMaterial({
      color: '#2f66c4',
      metalness: 1,
      roughness: 1,
    });
    const converted = toGameMaterial(pbr);
    expect(converted).toBeInstanceOf(THREE.MeshLambertMaterial);
    expect((converted as THREE.MeshLambertMaterial).color.getHexString()).toBe('2f66c4');
    expect(converted.side).toBe(THREE.DoubleSide);
  });

  it('cloneTrainModel keeps the seated child so layout pose cannot bury the mesh', () => {
    const body = new THREE.Group();
    body.name = 'fit:locomotive';
    body.position.y = 1.4;
    const marker = new THREE.Mesh(new THREE.BoxGeometry(2, 2.8, 1.2));
    marker.position.y = 1.4;
    body.add(marker);

    const template = new THREE.Group();
    template.name = 'model:locomotive';
    template.add(body);
    template.userData.smokeOffset = new THREE.Vector3(1, 2.5, 0);
    _setTrainModelForTests('locomotive', template);

    const cloned = cloneTrainModel('locomotive');
    expect(cloned).not.toBeNull();
    cloned!.position.set(10, 3, -4);
    cloned!.rotation.set(0, 0.5, 0);
    const fit = cloned!.getObjectByName('fit:locomotive');
    expect(fit?.position.y).toBeCloseTo(1.4, 5);
  });

  it('cloneTrainModel returns a material-cloned locomotive when cached', () => {
    const template = new THREE.Group();
    template.name = 'model:locomotive';
    template.userData.smokeOffset = new THREE.Vector3(1, 2, 0);
    const marker = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    marker.name = 'loco-glb';
    template.add(marker);
    _setTrainModelForTests('locomotive', template);

    expect(hasTrainModel('locomotive')).toBe(true);
    const cloned = cloneTrainModel('locomotive');
    expect(cloned).not.toBeNull();
    expect(cloned).not.toBe(template);
    expect(cloned?.getObjectByName('loco-glb')).toBeTruthy();
    expect(cloned?.userData.smokeOffset).toBeInstanceOf(THREE.Vector3);
    expect(cloned?.userData.smokeOffset).not.toBe(template.userData.smokeOffset);
  });
});
