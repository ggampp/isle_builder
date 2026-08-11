import * as THREE from 'three';
import { heightAt } from '../world/heightfield.ts';

export const TIE_SPACING = 1.35;
export const RAIL_GAUGE = 1.5;
const RAIL_HEIGHT = 0.32;

/** Pontos de controle do loop inicial sobre a mesa (dentro do anel do rio). */
export const DEFAULT_LOOP: ReadonlyArray<[number, number]> = [
  [-90, -30], [-60, -85], [0, -105], [70, -80], [105, -20],
  [90, 45], [40, 85], [-30, 95], [-85, 55],
];

/** Curva fechada da linha, elevada ao terreno. */
export function buildTrackCurve(
  points: ReadonlyArray<[number, number]> = DEFAULT_LOOP,
): THREE.CatmullRomCurve3 {
  const pts = points.map(([x, z]) =>
    new THREE.Vector3(x, heightAt(x, z) + 0.12, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  curve.arcLengthDivisions = 800;
  return curve;
}

/** Amostra a curva em pontos igualmente espaçados por arc-length. */
export function sampleTrack(
  curve: THREE.CatmullRomCurve3,
  spacing: number,
): { points: THREE.Vector3[]; tangents: THREE.Vector3[]; length: number } {
  const length = curve.getLength();
  const count = Math.max(8, Math.round(length / spacing));
  const points: THREE.Vector3[] = [];
  const tangents: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const u = i / count;
    points.push(curve.getPointAt(u));
    tangents.push(curve.getTangentAt(u));
  }
  return { points, tangents, length };
}

/** Dormentes instanciados + dois trilhos como tubos deslocados lateralmente. */
export function buildTrackMesh(curve: THREE.CatmullRomCurve3): THREE.Group {
  const group = new THREE.Group();
  const { points, tangents } = sampleTrack(curve, TIE_SPACING);

  const tieGeo = new THREE.BoxGeometry(2.3, 0.14, 0.62);
  const tieMat = new THREE.MeshLambertMaterial({ color: '#7a4a2b' });
  const ties = new THREE.InstancedMesh(tieGeo, tieMat, points.length);
  const m = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  for (let i = 0; i < points.length; i++) {
    const t = tangents[i];
    quat.setFromUnitVectors(new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(t.x, 0, t.z).normalize());
    m.compose(points[i], quat, new THREE.Vector3(1, 1, 1));
    ties.setMatrixAt(i, m);
  }
  ties.castShadow = true;
  group.add(ties);

  const railMat = new THREE.MeshLambertMaterial({ color: '#5c4632' });
  for (const side of [-1, 1]) {
    const offset = points.map((p, i) => {
      const t = tangents[i];
      const nx = -t.z;
      const nz = t.x;
      const inv = 1 / Math.max(1e-6, Math.hypot(nx, nz));
      return new THREE.Vector3(
        p.x + nx * inv * (RAIL_GAUGE / 2) * side,
        p.y + RAIL_HEIGHT / 2,
        p.z + nz * inv * (RAIL_GAUGE / 2) * side,
      );
    });
    const railCurve = new THREE.CatmullRomCurve3(offset, true, 'centripetal');
    const geo = new THREE.TubeGeometry(railCurve, offset.length, 0.09, 5, true);
    const rail = new THREE.Mesh(geo, railMat);
    rail.castShadow = true;
    group.add(rail);
  }
  return group;
}
