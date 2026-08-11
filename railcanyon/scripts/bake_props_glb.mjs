/**
 * Gera GLBs restantes do painel Construir: windmill, shed, lamp, bench.
 * Uso: node scripts/bake_props_glb.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { box, mat, roof, exportGlb } from './bake_lib.mjs';

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

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.7, 6.5, 10), mat(WALL));
  tower.position.y = 3.25;
  tower.castShadow = true;
  g.add(tower);

  g.add(box(2.2, 0.25, 2.2, WOOD_DARK, 0, 0));
  g.add(roof(1.7, 1.25, 1.7, ROOF_RED, 6.5));

  // Janela na torre
  g.add(box(0.55, 0.7, 0.08, TRIM, 0, 3.8, 1.35));
  g.add(box(0.4, 0.55, 0.06, '#8fc6e8', 0, 3.8, 1.4));

  const blades = new THREE.Group();
  blades.name = 'blades'; // modelLoader marca userData.spin por este nome
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group();
    const blade = box(0.3, 3.4, 0.75, BLADE, 0, 1.7, 0);
    // nervura
    arm.add(box(0.12, 3.2, 0.12, WOOD_DARK, 0, 1.7, 0.35));
    arm.add(blade);
    arm.rotation.z = (i * Math.PI) / 2;
    blades.add(arm);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.45, 10), mat(WOOD_DARK));
  hub.rotation.x = Math.PI / 2;
  blades.add(hub);
  blades.position.set(0, 5.7, 1.45);
  g.add(blades);

  return g;
}

function buildShed() {
  const g = new THREE.Group();
  g.name = 'shed';
  g.add(box(6.2, 2.5, 4.3, WOOD));
  g.add(box(6.6, 0.2, 4.7, WOOD_DARK, 0, 0));
  // Telhado inclinado (duas águas simples via boxes)
  const left = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.22, 2.6), mat(WOOD_DARK));
  left.position.set(0, 2.85, -1.0);
  left.rotation.x = 0.35;
  left.castShadow = true;
  g.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.22, 2.6), mat(WOOD_DARK));
  right.position.set(0, 2.85, 1.0);
  right.rotation.x = -0.35;
  right.castShadow = true;
  g.add(right);
  g.add(box(2.4, 1.9, 0.16, TRIM, 0, 0, 2.2));
  g.add(box(0.9, 0.9, 0.08, '#8fc6e8', -2.0, 1.2, 2.18));
  g.add(box(0.9, 0.9, 0.08, '#8fc6e8', 2.0, 1.2, 2.18));
  // Caixas empilhadas na frente
  g.add(box(0.9, 0.7, 0.7, '#c9a26a', -2.6, 0, 2.6));
  g.add(box(0.7, 0.55, 0.55, '#b5432f', -2.5, 0.7, 2.55));
  return g;
}

function buildLamp() {
  const g = new THREE.Group();
  g.name = 'lamp';
  g.add(box(0.55, 0.18, 0.55, METAL, 0, 0));
  g.add(box(0.2, 3.7, 0.2, METAL, 0, 0));
  // Braço
  g.add(box(0.9, 0.12, 0.12, METAL, 0.35, 3.5));
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.75), mat(GLOW));
  head.position.set(0.75, 3.55, 0);
  head.castShadow = true;
  g.add(head);
  g.add(box(0.85, 0.12, 0.85, METAL, 0.75, 3.85));
  // Detalhe emissivo via cor mais clara no topo
  g.add(box(0.35, 0.2, 0.35, '#ffe9a8', 0.75, 3.35));
  return g;
}

function buildBench() {
  const g = new THREE.Group();
  g.name = 'bench';
  g.add(box(2.5, 0.16, 0.75, WOOD, 0, 0.55));
  g.add(box(2.5, 0.75, 0.14, WOOD, 0, 0.72, -0.35));
  // ripas do assento
  g.add(box(2.4, 0.08, 0.18, '#c9a26a', 0, 0.66, 0.18));
  g.add(box(2.4, 0.08, 0.18, '#c9a26a', 0, 0.66, -0.05));
  g.add(box(0.18, 0.55, 0.65, WOOD_DARK, -1.05, 0));
  g.add(box(0.18, 0.55, 0.65, WOOD_DARK, 1.05, 0));
  // apoios do encosto
  g.add(box(0.12, 0.7, 0.12, WOOD_DARK, -1.05, 0.7, -0.35));
  g.add(box(0.12, 0.7, 0.12, WOOD_DARK, 1.05, 0.7, -0.35));
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
  console.log(`Wrote ${kind}.glb (${bytes} bytes)`);
}
