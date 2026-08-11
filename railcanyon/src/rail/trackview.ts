import * as THREE from 'three';
import { heightAt } from '../world/heightfield.ts';
import { sampleAt } from './network.ts';
import type { TrackPath, Vec3 } from './network.ts';
import { PIECE_SPECS, poseAlong } from './geometry.ts';
import type { PieceKind, Pose } from './geometry.ts';

const TIE_SPACING = 1.4;
const GAUGE = 1.55;
/** Acima desta altura livre o trecho ganha estrutura de cavalete. */
const TRESTLE_THRESHOLD = 1.6;

const TIE_MAT = new THREE.MeshLambertMaterial({ color: '#7a4a2b', flatShading: true });
const RAIL_MAT = new THREE.MeshLambertMaterial({ color: '#5c4632' });
const TIMBER_MAT = new THREE.MeshLambertMaterial({ color: '#6b4a2f', flatShading: true });

/** Malha da linha construída: dormentes, trilhos e pontes de cavalete. */
export function buildTrackMesh(path: TrackPath): THREE.Group {
  const group = new THREE.Group();
  if (path.points.length < 2) return group;

  const stations: { position: Vec3; tangent: Vec3 }[] = [];
  for (let s = 0; s <= path.totalLength; s += TIE_SPACING) stations.push(sampleAt(path, s));

  const ties = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.62, 0.15, 2.4), TIE_MAT, stations.length);
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const forward = new THREE.Vector3(1, 0, 0);
  const dir = new THREE.Vector3();
  for (let i = 0; i < stations.length; i++) {
    const { position, tangent } = stations[i];
    dir.set(tangent.x, tangent.y, tangent.z).normalize();
    quat.setFromUnitVectors(forward, dir);
    matrix.compose(new THREE.Vector3(position.x, position.y, position.z), quat, one);
    ties.setMatrixAt(i, matrix);
  }
  ties.castShadow = true;
  ties.receiveShadow = true;
  group.add(ties);

  for (const side of [-1, 1]) {
    const pts = stations.map(({ position, tangent }) => {
      const nx = -tangent.z;
      const nz = tangent.x;
      const inv = 1 / (Math.hypot(nx, nz) || 1);
      return new THREE.Vector3(
        position.x + nx * inv * (GAUGE / 2) * side,
        position.y + 0.17,
        position.z + nz * inv * (GAUGE / 2) * side,
      );
    });
    if (pts.length < 2) continue;
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(curve, Math.max(8, pts.length), 0.095, 5, false), RAIL_MAT);
    rail.castShadow = true;
    group.add(rail);
  }

  group.add(buildTrestles(stations));
  return group;
}

/** Cavaletes de madeira onde o tabuleiro se afasta do solo (vãos do canyon). */
function buildTrestles(stations: { position: Vec3; tangent: Vec3 }[]): THREE.Group {
  const group = new THREE.Group();
  const legs: THREE.Matrix4[] = [];
  const braces: THREE.Matrix4[] = [];
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();

  for (let i = 0; i < stations.length; i += 2) {
    const { position, tangent } = stations[i];
    const ground = heightAt(position.x, position.z);
    const clearance = position.y - ground;
    if (clearance < TRESTLE_THRESHOLD) continue;

    const nx = -tangent.z;
    const nz = tangent.x;
    const inv = 1 / (Math.hypot(nx, nz) || 1);
    for (const side of [-1, 1]) {
      const lx = position.x + nx * inv * 1.05 * side;
      const lz = position.z + nz * inv * 1.05 * side;
      const base = heightAt(lx, lz);
      const height = Math.max(0.5, position.y - base);
      matrix.compose(
        new THREE.Vector3(lx, base + height / 2, lz),
        quat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -side * 0.05),
        new THREE.Vector3(1, height, 1),
      );
      legs.push(matrix.clone());
    }
    // Travessa horizontal amarrando as duas pernas.
    const mid = ground + clearance * 0.45;
    matrix.compose(
      new THREE.Vector3(position.x, mid, position.z),
      quat.setFromUnitVectors(new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(nx * inv, 0, nz * inv)),
      new THREE.Vector3(2.4, 1, 1),
    );
    braces.push(matrix.clone());
  }

  if (legs.length > 0) {
    const legMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.34, 1, 0.34), TIMBER_MAT, legs.length);
    legs.forEach((m, i) => legMesh.setMatrixAt(i, m));
    legMesh.castShadow = true;
    group.add(legMesh);
  }
  if (braces.length > 0) {
    const braceMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 0.22, 0.22), TIMBER_MAT, braces.length);
    braces.forEach((m, i) => braceMesh.setMatrixAt(i, m));
    braceMesh.castShadow = true;
    group.add(braceMesh);
  }
  return group;
}

/** Prévia translúcida da próxima peça, colorida por validade. */
export function buildPiecePreview(start: Pose, kind: PieceKind, valid: boolean): THREE.Group {
  const group = new THREE.Group();
  const spec = PIECE_SPECS[kind];
  const steps = Math.max(4, Math.round(spec.length / 1.4));
  const mat = new THREE.MeshBasicMaterial({
    color: valid ? '#7bf06a' : '#f2564a',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const geo = new THREE.BoxGeometry(0.7, 0.2, 2.6);
  for (let i = 0; i <= steps; i++) {
    const pose = poseAlong(start, kind, i / steps);
    const tie = new THREE.Mesh(geo, mat);
    tie.position.set(pose.x, heightAt(pose.x, pose.z) + 0.5, pose.z);
    tie.rotation.y = -pose.heading;
    group.add(tie);
  }
  group.renderOrder = 6;
  return group;
}

/** Anel pulsante marcando a ponta da linha (o "railhead" do vídeo). */
export function createRailheadMarker(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.28, 8, 24),
    new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: 0.9 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 4;
  return mesh;
}

export function disposeGroup(group: THREE.Object3D): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
      obj.geometry.dispose();
    }
  });
}
