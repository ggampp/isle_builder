/**
 * Mid-poly nível B: casas (cottage, house, manor, cabin).
 * Uso: node scripts/bake_houses_glb.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { box, cone, cyl, doorDetail, exportGlb, mat, roof, stoneBase, windowDetail } from './bake_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../public/assets/models');

const WALL = '#e6d3ae';
const WALL_LIGHT = '#f0e2c4';
const TRIM = '#6b4a2f';
const ROOF_BLUE = '#3f6dc0';
const ROOF_RED = '#b5432f';
const ROOF_WOOD = '#8a5a34';
const STONE = '#9a8a78';

function siding(root, w, h, d, y0, colorA, colorB) {
  const rows = 6;
  const rowH = h / rows;
  for (let i = 0; i < rows; i++) {
    const col = i % 2 ? colorA : colorB;
    root.add(box(w + 0.04, rowH * 0.92, 0.06, col, 0, y0 + i * rowH, d / 2 + 0.02));
    root.add(box(w + 0.04, rowH * 0.92, 0.06, col, 0, y0 + i * rowH, -d / 2 - 0.02));
  }
}

function chimney(root, x, y, z, color, h = 1.2) {
  root.add(box(0.5, h, 0.5, color, x, y, z));
  root.add(box(0.62, 0.14, 0.62, TRIM, x, y + h, z));
  root.add(box(0.2, 0.25, 0.2, '#3a3a42', x, y + h + 0.1, z));
}

function buildCottage() {
  const g = new THREE.Group();
  g.name = 'cottage';
  g.add(stoneBase(4.6, 3.9, 0.28));
  g.add(box(4.2, 2.55, 3.5, WALL, 0, 0.28));
  siding(g, 4.15, 2.4, 3.45, 0.35, WALL, WALL_LIGHT);
  g.add(roof(3.5, 1.65, 3.1, ROOF_RED, 2.85));
  g.add(box(4.5, 0.1, 3.75, TRIM, 0, 2.8)); // beiral
  g.add(box(3.6, 0.12, 0.18, TRIM, 0, 4.35, 0)); // cumeeira
  g.add(doorDetail(0.95, 1.55, 0, 0.35, 1.82));
  g.add(box(1.1, 0.14, 0.7, STONE, 0, 0.28, 2.15));
  g.add(box(1.1, 0.1, 0.55, STONE, 0, 0.18, 2.35));
  g.add(windowDetail(0.9, 0.9, -1.3, 1.45, 1.78));
  g.add(windowDetail(0.9, 0.9, 1.3, 1.45, 1.78));
  g.add(windowDetail(0.75, 0.75, -2.12, 1.4, 0));
  g.add(windowDetail(0.75, 0.75, 2.12, 1.4, 0));
  chimney(g, -1.45, 2.85, -0.7, ROOF_RED, 1.15);
  // vasos
  g.add(cyl(0.18, 0.22, 0.28, '#b5432f', -1.7, 0.28, 2.0, 10));
  g.add(cyl(0.16, 0.2, 0.35, '#3f9b4f', -1.7, 0.55, 2.0, 8));
  return g;
}

function buildHouse() {
  const g = new THREE.Group();
  g.name = 'house';
  g.add(stoneBase(5.9, 4.5, 0.32));
  g.add(box(5.5, 3.15, 4.1, WALL_LIGHT, 0, 0.32));
  siding(g, 5.45, 3.0, 4.05, 0.4, WALL_LIGHT, WALL);
  g.add(roof(4.3, 1.9, 3.5, ROOF_BLUE, 3.45));
  g.add(box(5.75, 0.12, 4.35, TRIM, 0, 3.4));
  g.add(box(4.5, 0.14, 0.2, TRIM, 0, 5.2, 0));
  // varanda
  g.add(box(2.4, 0.12, 1.1, STONE, -1.35, 0.32, 2.55));
  g.add(cyl(0.1, 0.12, 2.0, WALL, -2.3, 0.44, 2.9, 10));
  g.add(cyl(0.1, 0.12, 2.0, WALL, -0.4, 0.44, 2.9, 10));
  g.add(box(2.2, 0.12, 0.12, TRIM, -1.35, 2.4, 2.9));
  g.add(doorDetail(1.05, 1.95, -1.35, 0.4, 2.12));
  g.add(windowDetail(1.1, 1.1, 1.4, 1.7, 2.08));
  g.add(windowDetail(0.95, 0.95, 2.78, 1.7, 0.6));
  g.add(windowDetail(0.95, 0.95, -2.78, 1.7, 0.6));
  g.add(windowDetail(0.95, 0.95, 2.78, 1.7, -0.8));
  g.add(windowDetail(0.85, 0.85, 0, 1.7, -2.08));
  chimney(g, 1.9, 3.45, -0.85, ROOF_BLUE, 1.4);
  return g;
}

function buildManor() {
  const g = new THREE.Group();
  g.name = 'manor';
  g.add(stoneBase(7.6, 5.6, 0.35));
  g.add(box(7.2, 3.45, 5.2, WALL, 0, 0.35));
  g.add(box(3.6, 2.55, 4.7, WALL_LIGHT, 1.7, 3.8));
  siding(g, 7.15, 3.3, 5.15, 0.4, WALL, WALL_LIGHT);
  g.add(roof(5.5, 2.15, 4.2, ROOF_RED, 3.8));
  g.add(roof(2.9, 1.35, 2.5, ROOF_RED, 6.35));
  g.add(box(7.4, 0.14, 5.4, TRIM, 0, 3.75));
  // torre
  g.add(box(1.05, 2.8, 1.05, ROOF_RED, -2.7, 3.8));
  g.add(box(1.2, 0.22, 1.2, TRIM, -2.7, 6.6));
  g.add(cone(0.55, 0.7, ROOF_RED, -2.7, 6.8, 0, 10));
  // entrada
  g.add(box(2.6, 0.16, 1.2, STONE, -1.9, 0.35, 2.95));
  g.add(cyl(0.14, 0.16, 2.35, WALL_LIGHT, -2.85, 0.5, 3.15, 12));
  g.add(cyl(0.14, 0.16, 2.35, WALL_LIGHT, -0.95, 0.5, 3.15, 12));
  g.add(box(2.3, 0.28, 0.35, TRIM, -1.9, 2.75, 2.85));
  g.add(doorDetail(1.35, 2.2, -1.9, 0.45, 2.68));
  g.add(windowDetail(1.15, 1.25, 0.55, 1.85, 2.62));
  g.add(windowDetail(1.15, 1.25, 2.15, 1.85, 2.62));
  g.add(windowDetail(0.95, 0.95, 1.7, 4.85, 2.4));
  g.add(windowDetail(0.9, 1.0, -3.65, 1.9, 0));
  g.add(windowDetail(0.9, 1.0, 3.65, 1.9, 0));
  chimney(g, 2.8, 6.35, -1.0, ROOF_RED, 1.1);
  // balaustrada do segundo volume
  for (let i = -1; i <= 1; i++) {
    g.add(box(0.1, 0.55, 0.1, TRIM, 1.7 + i * 0.9, 6.3, 2.25));
  }
  g.add(box(2.2, 0.08, 0.08, TRIM, 1.7, 6.85, 2.25));
  return g;
}

function buildCabin() {
  const g = new THREE.Group();
  g.name = 'cabin';
  g.add(stoneBase(5.5, 4.0, 0.3, '#6b4a2f', '#5c4632'));
  const logs = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const y = 0.45 + i * 0.52;
    const col = i % 2 ? '#7d5433' : '#6b4a2f';
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 5.3, 12), mat(col));
    log.rotation.z = Math.PI / 2;
    log.position.set(0, y, 0);
    log.castShadow = true;
    logs.add(log);
  }
  for (let i = 0; i < 7; i++) {
    const y = 0.45 + i * 0.52;
    const col = i % 2 ? '#6b4a2f' : '#7d5433';
    for (const sx of [-2.4, 2.4]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.7, 12), mat(col));
      log.rotation.x = Math.PI / 2;
      log.position.set(sx, y, 0);
      log.castShadow = true;
      logs.add(log);
    }
  }
  g.add(logs);
  g.add(roof(3.95, 1.6, 2.95, ROOF_WOOD, 3.95));
  g.add(box(5.4, 0.12, 3.9, TRIM, 0, 3.9));
  g.add(box(4.1, 0.12, 0.16, TRIM, 0, 5.4, 0));
  // alpendre
  g.add(box(2.2, 0.12, 1.0, '#5c4632', 0, 0.3, 2.2));
  g.add(cyl(0.09, 0.1, 2.1, TRIM, -0.9, 0.4, 2.55, 10));
  g.add(cyl(0.09, 0.1, 2.1, TRIM, 0.9, 0.4, 2.55, 10));
  g.add(box(2.0, 0.1, 0.1, TRIM, 0, 2.45, 2.55));
  g.add(doorDetail(0.95, 1.6, 0, 0.4, 1.95, '#4a3020', '#6b4a2f'));
  g.add(windowDetail(0.75, 0.75, -1.45, 1.75, 1.9));
  g.add(windowDetail(0.75, 0.75, 1.45, 1.75, 1.9));
  chimney(g, 1.55, 3.95, -0.55, ROOF_WOOD, 1.05);
  // lenha empilhada
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.12, 0.12, 0.9, '#7d5433', -2.5, 0.35 + i * 0.22, 1.6, 8, 0, 0, Math.PI / 2));
  }
  return g;
}

const builders = { cottage: buildCottage, house: buildHouse, manor: buildManor, cabin: buildCabin };

for (const [kind, build] of Object.entries(builders)) {
  const bytes = await exportGlb(build(), join(OUT_DIR, `${kind}.glb`));
  console.log(`[mid-B] ${kind}.glb (${bytes} bytes)`);
}
