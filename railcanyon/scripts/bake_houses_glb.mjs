/**
 * Gera GLBs low-poly das casas (cottage, house, manor, cabin).
 * Mais detalhe que o procedural (beirais, chaminé, degraus, janelas) para validar o pipeline.
 *
 * Uso: node scripts/bake_houses_glb.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { box, mat, roof, exportGlb } from './bake_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../public/assets/models');

const WALL = '#e6d3ae';
const WALL_LIGHT = '#f0e2c4';
const TRIM = '#6b4a2f';
const ROOF_BLUE = '#3f6dc0';
const ROOF_RED = '#b5432f';
const ROOF_WOOD = '#8a5a34';
const WINDOW = '#8fc6e8';
const STONE = '#9a8a78';

function windowPane(w, h, x, y, z) {
  const frame = box(w + 0.12, h + 0.12, 0.08, TRIM, x, y, z);
  const glass = box(w, h, 0.06, WINDOW, x, y, z + 0.02);
  return [frame, glass];
}

function buildCottage() {
  const g = new THREE.Group();
  g.name = 'cottage';
  g.add(box(4.2, 2.6, 3.5, WALL));
  g.add(box(4.5, 0.18, 3.8, STONE, 0, 0)); // base de pedra
  g.add(roof(3.4, 1.55, 3.0, ROOF_RED, 2.6));
  g.add(box(0.9, 1.5, 0.14, TRIM, 0, 0, 1.82)); // porta
  g.add(box(0.7, 0.12, 0.55, STONE, 0, 0, 2.05)); // degrau
  for (const pane of windowPane(0.85, 0.85, -1.25, 1.2, 1.78)) g.add(pane);
  for (const pane of windowPane(0.85, 0.85, 1.25, 1.2, 1.78)) g.add(pane);
  g.add(box(0.45, 1.1, 0.45, ROOF_RED, -1.4, 2.6, -0.6)); // chaminé
  return g;
}

function buildHouse() {
  const g = new THREE.Group();
  g.name = 'house';
  g.add(box(5.5, 3.2, 4.1, WALL_LIGHT));
  g.add(box(5.8, 0.2, 4.4, STONE, 0, 0));
  g.add(roof(4.2, 1.85, 3.4, ROOF_BLUE, 3.2));
  // Beiral sob o telhado
  g.add(box(5.7, 0.12, 4.3, TRIM, 0, 3.15));
  g.add(box(1.05, 1.9, 0.14, TRIM, -1.35, 0, 2.12));
  g.add(box(0.85, 0.14, 0.7, STONE, -1.35, 0, 2.35));
  for (const pane of windowPane(1.05, 1.05, 1.35, 1.35, 2.08)) g.add(pane);
  // Janelas laterais
  g.add(box(0.08, 1.0, 1.0, TRIM, 2.78, 1.4, 0));
  g.add(box(0.06, 0.85, 0.85, WINDOW, 2.82, 1.4, 0));
  g.add(box(0.08, 1.0, 1.0, TRIM, -2.78, 1.4, 0));
  g.add(box(0.06, 0.85, 0.85, WINDOW, -2.82, 1.4, 0));
  g.add(box(0.5, 1.4, 0.5, ROOF_BLUE, 1.8, 3.2, -0.8));
  return g;
}

function buildManor() {
  const g = new THREE.Group();
  g.name = 'manor';
  g.add(box(7.2, 3.5, 5.2, WALL));
  g.add(box(7.5, 0.25, 5.5, STONE, 0, 0));
  // Segundo volume
  g.add(box(3.5, 2.5, 4.7, WALL_LIGHT, 1.7, 3.5));
  g.add(roof(5.4, 2.1, 4.1, ROOF_RED, 3.5));
  g.add(roof(2.8, 1.3, 2.4, ROOF_RED, 6.0));
  // Torre/chaminé
  g.add(box(1.0, 2.6, 1.0, ROOF_RED, -2.6, 3.5));
  g.add(box(1.15, 0.35, 1.15, TRIM, -2.6, 6.1));
  // Entrada com frontão
  g.add(box(1.4, 2.2, 0.16, TRIM, -1.9, 0, 2.68));
  g.add(box(2.2, 0.16, 1.0, STONE, -1.9, 0, 2.9));
  g.add(box(2.4, 0.35, 0.35, TRIM, -1.9, 2.2, 2.55));
  for (const pane of windowPane(1.1, 1.2, 0.6, 1.5, 2.62)) g.add(pane);
  for (const pane of windowPane(1.1, 1.2, 2.2, 1.5, 2.62)) g.add(pane);
  for (const pane of windowPane(0.9, 0.9, 1.7, 4.4, 2.4)) g.add(pane);
  // Colunas da entrada
  g.add(box(0.28, 2.2, 0.28, WALL_LIGHT, -2.7, 0, 2.85));
  g.add(box(0.28, 2.2, 0.28, WALL_LIGHT, -1.1, 0, 2.85));
  return g;
}

function buildCabin() {
  const g = new THREE.Group();
  g.name = 'cabin';
  const logs = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 5.2, 8),
      mat(i % 2 ? '#7d5433' : '#6b4a2f'),
    );
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 0.35 + i * 0.58, 0);
    log.castShadow = true;
    logs.add(log);
  }
  // Troncos frontais/traseiros (cruzados)
  for (let i = 0; i < 6; i++) {
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 3.6, 8),
      mat(i % 2 ? '#6b4a2f' : '#7d5433'),
    );
    log.rotation.x = Math.PI / 2;
    log.position.set(-2.35, 0.35 + i * 0.58, 0);
    log.castShadow = true;
    logs.add(log);
    const logR = log.clone();
    logR.position.x = 2.35;
    logs.add(logR);
  }
  g.add(logs);
  g.add(box(5.3, 0.45, 3.8, TRIM, 0, 0));
  g.add(roof(3.8, 1.5, 2.8, ROOF_WOOD, 3.6));
  g.add(box(0.95, 1.55, 0.14, '#4a3020', 0, 0, 1.95));
  g.add(box(0.75, 0.12, 0.55, STONE, 0, 0, 2.15));
  for (const pane of windowPane(0.7, 0.7, -1.4, 1.6, 1.9)) g.add(pane);
  for (const pane of windowPane(0.7, 0.7, 1.4, 1.6, 1.9)) g.add(pane);
  g.add(box(0.4, 1.0, 0.4, ROOF_WOOD, 1.5, 3.6, -0.5));
  return g;
}

const builders = {
  cottage: buildCottage,
  house: buildHouse,
  manor: buildManor,
  cabin: buildCabin,
};

for (const [kind, build] of Object.entries(builders)) {
  const bytes = await exportGlb(build(), join(OUT_DIR, `${kind}.glb`));
  console.log(`Wrote ${kind}.glb (${bytes} bytes)`);
}
