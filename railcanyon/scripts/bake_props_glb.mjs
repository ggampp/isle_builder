/**
 * Mid-poly nível B: windmill, shed, lamp, bench.
 * Uso: node scripts/bake_props_glb.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { box, cone, cyl, exportGlb, mat, roof, windowDetail } from './bake_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../public/assets/models');

const WALL = '#e6d3ae';
const TRIM = '#6b4a2f';
const WOOD = '#8a5a34';
const WOOD_DARK = '#5c4632';
const ROOF_RED = '#b5432f';
const BLADE = '#f2e6cc';
const METAL = '#3a3a42';
const GLOW = '#f5d98a';

function buildWindmill() {
  const g = new THREE.Group();
  g.name = 'windmill';

  g.add(box(2.4, 0.3, 2.4, WOOD_DARK, 0, 0));
  const tower = cyl(0.92, 1.75, 6.6, WALL, 0, 0.3, 0, 16);
  g.add(tower);
  // anéis da torre
  for (const y of [1.8, 3.4, 5.0]) {
    g.add(cyl(1.05 - (y - 1.8) * 0.05, 1.15 - (y - 1.8) * 0.05, 0.12, TRIM, 0, y, 0, 16));
  }
  g.add(roof(1.85, 1.35, 1.85, ROOF_RED, 6.9));
  g.add(box(0.2, 0.35, 0.2, METAL, 0, 8.2, 0));

  g.add(windowDetail(0.55, 0.7, 0, 3.9, 1.45));
  g.add(windowDetail(0.45, 0.55, 0, 2.2, 1.55));

  // galeria
  g.add(cyl(1.35, 1.35, 0.12, WOOD_DARK, 0, 5.5, 0, 16));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(box(0.08, 0.55, 0.08, TRIM, Math.cos(a) * 1.25, 5.6, Math.sin(a) * 1.25));
  }

  const blades = new THREE.Group();
  blades.name = 'blades';
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    arm.add(box(0.18, 3.6, 0.18, WOOD_DARK, 0, 1.85, 0));
    arm.add(box(0.35, 3.3, 0.85, BLADE, 0, 1.9, 0.2));
    // ripas da pá
    for (let r = 0; r < 5; r++) {
      arm.add(box(0.08, 0.55, 0.7, WOOD, 0, 0.6 + r * 0.65, 0.35));
    }
    arm.rotation.z = (i * Math.PI) / 2;
    blades.add(arm);
  }
  const hub = cyl(0.38, 0.38, 0.55, WOOD_DARK, 0, 0, 0, 12);
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, 0, 0);
  blades.add(hub);
  blades.position.set(0, 5.85, 1.55);
  g.add(blades);

  // porta na base
  g.add(box(0.7, 1.3, 0.1, TRIM, 0, 0.35, 1.55));
  return g;
}

function buildShed() {
  const g = new THREE.Group();
  g.name = 'shed';
  g.add(box(6.4, 0.25, 4.5, WOOD_DARK, 0, 0));
  g.add(box(6.2, 2.55, 4.3, WOOD, 0, 0.25));
  // ripas laterais
  for (let i = 0; i < 8; i++) {
    g.add(box(0.08, 2.4, 0.06, WOOD_DARK, -3.05 + i * 0.85, 0.35, 2.18));
  }
  const left = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.2, 2.7), mat(WOOD_DARK));
  left.position.set(0, 3.15, -1.05);
  left.rotation.x = 0.38;
  left.castShadow = true;
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.2, 2.7), mat(WOOD_DARK));
  right.position.set(0, 3.15, 1.05);
  right.rotation.x = -0.38;
  right.castShadow = true;
  g.add(right);
  g.add(box(6.5, 0.12, 0.18, TRIM, 0, 3.55, 0));

  g.add(box(2.5, 2.0, 0.14, TRIM, 0, 0.3, 2.22));
  g.add(box(1.1, 0.12, 0.08, '#c9a26a', -0.45, 1.2, 2.32));
  g.add(box(1.1, 0.12, 0.08, '#c9a26a', 0.45, 1.2, 2.32));
  g.add(windowDetail(0.95, 0.95, -2.05, 1.45, 2.18));
  g.add(windowDetail(0.95, 0.95, 2.05, 1.45, 2.18));

  // caixas e barril
  g.add(box(0.95, 0.75, 0.75, '#c9a26a', -2.7, 0.25, 2.65));
  g.add(box(0.75, 0.55, 0.6, ROOF_RED, -2.55, 1.0, 2.6));
  g.add(cyl(0.38, 0.42, 0.85, WOOD_DARK, 2.6, 0.25, 2.55, 14));
  g.add(cyl(0.4, 0.4, 0.08, TRIM, 2.6, 0.55, 2.55, 14));
  return g;
}

function buildLamp() {
  const g = new THREE.Group();
  g.name = 'lamp';
  g.add(box(0.65, 0.22, 0.65, METAL, 0, 0));
  g.add(cyl(0.12, 0.14, 3.5, METAL, 0, 0.22, 0, 12));
  // anéis no poste
  for (const y of [1.2, 2.4, 3.4]) {
    g.add(cyl(0.16, 0.16, 0.08, '#2a2a30', 0, y, 0, 10));
  }
  g.add(box(1.05, 0.1, 0.12, METAL, 0.4, 3.55));
  // lanterna
  g.add(box(0.7, 0.12, 0.7, METAL, 0.85, 3.95));
  g.add(box(0.55, 0.55, 0.55, GLOW, 0.85, 3.45));
  g.add(box(0.35, 0.18, 0.35, '#ffe9a8', 0.85, 3.35));
  // armação da lanterna
  for (const [dx, dz] of [
    [-0.28, -0.28],
    [0.28, -0.28],
    [-0.28, 0.28],
    [0.28, 0.28],
  ]) {
    g.add(box(0.06, 0.65, 0.06, METAL, 0.85 + dx, 3.4, dz));
  }
  g.add(cone(0.42, 0.28, METAL, 0.85, 4.05, 0, 10));
  return g;
}

function buildBench() {
  const g = new THREE.Group();
  g.name = 'bench';
  // pernas curvas em caixa
  g.add(box(0.16, 0.58, 0.7, WOOD_DARK, -1.1, 0));
  g.add(box(0.16, 0.58, 0.7, WOOD_DARK, 1.1, 0));
  g.add(box(0.14, 0.14, 0.7, METAL, -1.1, 0.1, 0));
  g.add(box(0.14, 0.14, 0.7, METAL, 1.1, 0.1, 0));
  // ripas do assento
  for (let i = 0; i < 4; i++) {
    g.add(box(2.55, 0.1, 0.16, WOOD, 0, 0.58, -0.28 + i * 0.18));
  }
  // encosto
  g.add(box(0.12, 0.85, 0.12, WOOD_DARK, -1.1, 0.65, -0.38));
  g.add(box(0.12, 0.85, 0.12, WOOD_DARK, 1.1, 0.65, -0.38));
  for (let i = 0; i < 3; i++) {
    g.add(box(2.45, 0.1, 0.12, '#c9a26a', 0, 0.95 + i * 0.22, -0.38));
  }
  g.add(box(2.55, 0.12, 0.12, WOOD_DARK, 0, 1.55, -0.38));
  return g;
}

const builders = {
  windmill: buildWindmill,
  shed: buildShed,
  lamp: buildLamp,
  bench: buildBench,
};

for (const [kind, build] of Object.entries(builders)) {
  const bytes = await exportGlb(build(), join(OUT_DIR, `${kind}.glb`));
  console.log(`[mid-B] ${kind}.glb (${bytes} bytes)`);
}
