import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { alignCarToTangent } from './train.ts';

describe('orientação do trem no trilho', () => {
  it('alinha o +X do carro com a tangente, como as dormentes', () => {
    const car = new THREE.Group();
    alignCarToTangent(car, { x: 1, y: 0, z: 0 }, false);
    const along = new THREE.Vector3(1, 0, 0).applyQuaternion(car.quaternion);
    expect(along.x).toBeCloseTo(1, 5);
    expect(along.z).toBeCloseTo(0, 5);

    alignCarToTangent(car, { x: 0, y: 0, z: 1 }, false);
    along.set(1, 0, 0).applyQuaternion(car.quaternion);
    expect(along.x).toBeCloseTo(0, 5);
    expect(along.z).toBeCloseTo(1, 5);
  });

  it('inverte o sentido sem sair do trilho', () => {
    const car = new THREE.Group();
    alignCarToTangent(car, { x: 0, y: 0, z: 1 }, true);
    const along = new THREE.Vector3(1, 0, 0).applyQuaternion(car.quaternion);
    expect(along.z).toBeCloseTo(-1, 5);
  });
});
