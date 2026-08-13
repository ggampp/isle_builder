import * as THREE from 'three';
import {
  HEIGHT_SCALE,
  SIZE,
  cellHeight,
  isSand,
  isWater,
} from '../sim/world.ts';

const DIRT = new THREE.Color('#7a4a28');
const GRASS_A = new THREE.Color('#5aaa3a');
const GRASS_B = new THREE.Color('#6fbe48');
const SAND = new THREE.Color('#e2c48a');
const ROCK = new THREE.Color('#8a5a3c');
const COBBLE = new THREE.Color('#6a8aa0');

export function buildTerrain(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  const columns: { x: number; z: number; h: number; top: THREE.Color }[] = [];
  const beds: { x: number; z: number }[] = [];

  for (let z = 0; z < SIZE; z++) {
    for (let x = 0; x < SIZE; x++) {
      const h = cellHeight(x, z);
      if (h <= 0) {
        beds.push({ x, z });
        continue;
      }
      let top = GRASS_A;
      if (isSand(x, z)) top = SAND;
      else if (h >= 5) top = ROCK;
      else if ((x + z) % 3 === 0) top = GRASS_B;
      columns.push({ x, z, h, top });
    }
  }

  const colGeo = new THREE.BoxGeometry(1, 1, 1);
  colGeo.translate(0, 0.5, 0);
  const colMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const colMesh = new THREE.InstancedMesh(colGeo, colMat, columns.length);
  colMesh.castShadow = true;
  colMesh.receiveShadow = true;

  const topGeo = new THREE.BoxGeometry(1.01, 0.08, 1.01);
  const topMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const topMesh = new THREE.InstancedMesh(topGeo, topMat, columns.length);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < columns.length; i++) {
    const c = columns[i];
    const worldH = c.h * HEIGHT_SCALE;
    dummy.position.set(c.x + 0.5, 0, c.z + 0.5);
    dummy.scale.set(1, worldH, 1);
    dummy.updateMatrix();
    colMesh.setMatrixAt(i, dummy.matrix);
    color.copy(DIRT).multiplyScalar(0.92 + ((c.x * 13 + c.z * 7) % 5) * 0.025);
    colMesh.setColorAt(i, color);

    dummy.position.set(c.x + 0.5, worldH, c.z + 0.5);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    topMesh.setMatrixAt(i, dummy.matrix);
    topMesh.setColorAt(i, c.top);
  }
  colMesh.instanceMatrix.needsUpdate = true;
  topMesh.instanceMatrix.needsUpdate = true;
  if (colMesh.instanceColor) colMesh.instanceColor.needsUpdate = true;
  if (topMesh.instanceColor) topMesh.instanceColor.needsUpdate = true;
  group.add(colMesh);
  group.add(topMesh);

  if (beds.length > 0) {
    const bedGeo = new THREE.BoxGeometry(1, 0.12, 1);
    const bedMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const bedMesh = new THREE.InstancedMesh(bedGeo, bedMat, beds.length);
    bedMesh.receiveShadow = true;
    for (let i = 0; i < beds.length; i++) {
      const b = beds[i];
      dummy.position.set(b.x + 0.5, 0.04, b.z + 0.5);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bedMesh.setMatrixAt(i, dummy.matrix);
      color.copy(COBBLE).multiplyScalar(0.85 + ((b.x + b.z) % 4) * 0.05);
      bedMesh.setColorAt(i, color);
    }
    bedMesh.instanceMatrix.needsUpdate = true;
    if (bedMesh.instanceColor) bedMesh.instanceColor.needsUpdate = true;
    group.add(bedMesh);
  }

  scatterProps(group);
  scene.add(group);
  return group;
}

function scatterProps(group: THREE.Group): void {
  const bushGeo = new THREE.SphereGeometry(0.42, 7, 6);
  const bushMat = new THREE.MeshLambertMaterial({ color: 0x3f8a32 });
  const rockGeo = new THREE.DodecahedronGeometry(0.55, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x6b4a32 });
  const dummy = new THREE.Object3D();

  const bushes: THREE.Vector3[] = [];
  const rocks: THREE.Vector3[] = [];
  for (let z = 2; z < SIZE - 2; z += 2) {
    for (let x = 2; x < SIZE - 2; x += 2) {
      if (isWater(x, z) || isSand(x, z)) continue;
      const h = cellHeight(x, z);
      const n = hash(x, z);
      const y = h * HEIGHT_SCALE;
      if (n > 0.82) bushes.push(new THREE.Vector3(x + 0.5, y + 0.28, z + 0.5));
      else if (n > 0.74 && h >= 3) rocks.push(new THREE.Vector3(x + 0.5, y + 0.35, z + 0.5));
    }
  }

  if (bushes.length) {
    const mesh = new THREE.InstancedMesh(bushGeo, bushMat, bushes.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    for (let i = 0; i < bushes.length; i++) {
      const p = bushes[i];
      dummy.position.copy(p);
      const s = 0.7 + hash(p.x, p.z) * 0.7;
      dummy.scale.set(s, s * 0.85, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    group.add(mesh);
  }

  if (rocks.length) {
    const mesh = new THREE.InstancedMesh(rockGeo, rockMat, rocks.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    for (let i = 0; i < rocks.length; i++) {
      const p = rocks[i];
      dummy.position.copy(p);
      dummy.rotation.set(hash(p.z, p.x) * 1.2, hash(p.x, p.z) * 6, 0.2);
      const s = 0.8 + hash(p.z, p.x + 3) * 0.9;
      dummy.scale.set(s, s * 0.75, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    group.add(mesh);
  }
}

function hash(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
