/**
 * Gera o GLB low-poly da torre d'água.
 * Uso: node scripts/bake_watertower_glb.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { box, mat, exportGlb } from './bake_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../public/assets/models/watertower.glb');

function buildWatertower() {
  const root = new THREE.Group();
  root.name = 'watertower';

  const wood = '#5c4632';
  const woodDark = '#4a3828';
  const tankColor = '#7d5433';
  const band = '#c9a26a';
  const roofColor = '#3f6dc0';

  for (const [lx, lz] of [
    [-1.35, -1.35],
    [1.35, -1.35],
    [-1.35, 1.35],
    [1.35, 1.35],
  ]) {
    const leg = box(0.34, 4.6, 0.34, wood, lx, 0, lz);
    leg.rotation.set(lz * 0.025, 0, -lx * 0.025);
    root.add(leg);
  }

  for (const y of [1.4, 2.8]) {
    root.add(box(2.9, 0.14, 0.14, woodDark, 0, y, -1.35));
    root.add(box(2.9, 0.14, 0.14, woodDark, 0, y, 1.35));
    root.add(box(0.14, 0.14, 2.9, woodDark, -1.35, y, 0));
    root.add(box(0.14, 0.14, 2.9, woodDark, 1.35, y, 0));
  }

  root.add(box(3.4, 0.22, 3.4, woodDark, 0, 4.5));

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 2.7, 14), mat(tankColor));
  tank.position.y = 5.95;
  tank.castShadow = true;
  root.add(tank);

  for (const y of [5.1, 5.95, 6.8]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.08, 0.07, 6, 20), mat(band));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    root.add(ring);
  }

  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.35, 1.15, 14), mat(roofColor));
  cap.position.y = 7.75;
  cap.castShadow = true;
  root.add(cap);

  const ladder = new THREE.Group();
  ladder.position.set(2.15, 0, 0);
  ladder.add(box(0.1, 5.2, 0.1, woodDark, -0.28, 0));
  ladder.add(box(0.1, 5.2, 0.1, woodDark, 0.28, 0));
  for (let i = 0; i < 10; i++) {
    ladder.add(box(0.7, 0.08, 0.1, band, 0, 0.35 + i * 0.5));
  }
  root.add(ladder);

  return root;
}

const bytes = await exportGlb(buildWatertower(), OUT);
console.log(`Wrote ${OUT} (${bytes} bytes)`);
