import * as THREE from 'three';
import { WATER_LEVEL, heightAt, slopeAt } from './heightfield.ts';

/** RNG determinístico (mulberry32). */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ScatterSpec {
  count: number;
  geometry: THREE.BufferGeometry;
  colors: string[];
  minScale: number;
  maxScale: number;
  maxSlope: number;
  yOffset: number;
}

/**
 * Vegetação e pedras instanciadas. Evita o rio (altura) e a faixa da linha
 * férrea (distância aos pontos amostrados da track).
 */
export function buildScatter(trackPoints: THREE.Vector3[]): THREE.Group {
  const group = new THREE.Group();
  const rng = makeRng(20260811);

  const cell = 8;
  const occupied = new Set<string>();
  for (const p of trackPoints) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oz = -1; oz <= 1; oz++) {
        occupied.add(`${Math.floor(p.x / cell) + ox},${Math.floor(p.z / cell) + oz}`);
      }
    }
  }
  const nearTrack = (x: number, z: number): boolean =>
    occupied.has(`${Math.floor(x / cell)},${Math.floor(z / cell)}`);

  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  rockGeo.translate(0, 0.35, 0);
  const cactusGeo = new THREE.CylinderGeometry(0.32, 0.4, 2.4, 7);
  cactusGeo.translate(0, 1.2, 0);
  const bushGeo = new THREE.IcosahedronGeometry(0.7, 0);
  bushGeo.translate(0, 0.4, 0);
  const flowerGeo = new THREE.IcosahedronGeometry(0.3, 0);
  flowerGeo.translate(0, 0.2, 0);

  const specs: ScatterSpec[] = [
    { count: 700, geometry: rockGeo, colors: ['#c05038', '#d97e4a', '#a63c2e', '#b5573c'],
      minScale: 0.5, maxScale: 2.6, maxSlope: 1.2, yOffset: -0.15 },
    { count: 380, geometry: cactusGeo, colors: ['#3f9b4f', '#2f8040', '#4dae5c'],
      minScale: 0.5, maxScale: 1.25, maxSlope: 0.35, yOffset: -0.1 },
    { count: 420, geometry: bushGeo, colors: ['#5da95a', '#7bbf67', '#4c9a52'],
      minScale: 0.6, maxScale: 1.4, maxSlope: 0.4, yOffset: -0.1 },
    { count: 260, geometry: flowerGeo, colors: ['#d977a8', '#c95f92', '#e08fba'],
      minScale: 0.6, maxScale: 1.2, maxSlope: 0.35, yOffset: -0.05 },
  ];

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();

  for (const spec of specs) {
    const mesh = new THREE.InstancedMesh(
      spec.geometry,
      new THREE.MeshLambertMaterial({ flatShading: true }),
      spec.count,
    );
    let placed = 0;
    let guard = 0;
    while (placed < spec.count && guard < spec.count * 30) {
      guard++;
      const x = (rng() - 0.5) * 420;
      const z = (rng() - 0.5) * 420;
      const y = heightAt(x, z);
      if (y < WATER_LEVEL + 0.6) continue;
      if (slopeAt(x, z) > spec.maxSlope) continue;
      if (nearTrack(x, z)) continue;
      const s = spec.minScale + rng() * (spec.maxScale - spec.minScale);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI * 2);
      scale.set(s, s * (0.85 + rng() * 0.3), s);
      m.compose(new THREE.Vector3(x, y + spec.yOffset, z), q, scale);
      mesh.setMatrixAt(placed, m);
      color.set(spec.colors[Math.floor(rng() * spec.colors.length)]);
      mesh.setColorAt(placed, color);
      placed++;
    }
    mesh.count = placed;
    mesh.castShadow = true;
    group.add(mesh);
  }
  return group;
}
