/**
 * Mid-poly nível B: torre d'água.
 * Uso: node scripts/bake_watertower_glb.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { box, cone, cyl, exportGlb, mat } from './bake_lib.mjs';

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

  // pernas com inclinação + sapatas
  for (const [lx, lz] of [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ]) {
    root.add(box(0.55, 0.22, 0.55, woodDark, lx, 0, lz));
    const leg = box(0.32, 4.7, 0.32, wood, lx, 0.2, lz);
    leg.rotation.set(lz * 0.028, 0, -lx * 0.028);
    root.add(leg);
  }

  // cruzetas diagonais
  for (const y of [1.2, 2.6, 3.9]) {
    root.add(box(2.95, 0.12, 0.12, woodDark, 0, y, -1.4));
    root.add(box(2.95, 0.12, 0.12, woodDark, 0, y, 1.4));
    root.add(box(0.12, 0.12, 2.95, woodDark, -1.4, y, 0));
    root.add(box(0.12, 0.12, 2.95, woodDark, 1.4, y, 0));
    // diagonal
    const diag = box(0.1, 1.35, 0.1, wood, 0, y - 0.5, 0);
    diag.rotation.z = 0.7;
    root.add(diag);
  }

  // plataforma + corrimão
  root.add(box(3.6, 0.2, 3.6, woodDark, 0, 4.55));
  for (const [px, pz] of [
    [-1.6, -1.6],
    [1.6, -1.6],
    [-1.6, 1.6],
    [1.6, 1.6],
  ]) {
    root.add(box(0.1, 0.7, 0.1, wood, px, 4.75, pz));
  }
  root.add(box(3.3, 0.08, 0.08, band, 0, 5.4, -1.6));
  root.add(box(3.3, 0.08, 0.08, band, 0, 5.4, 1.6));
  root.add(box(0.08, 0.08, 3.3, band, -1.6, 5.4, 0));
  root.add(box(0.08, 0.08, 3.3, band, 1.6, 5.4, 0));

  const tank = cyl(2.1, 2.1, 2.85, tankColor, 0, 5.0, 0, 22);
  root.add(tank);

  // ripas verticais no tanque
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    root.add(
      box(0.08, 2.6, 0.12, woodDark, Math.cos(a) * 2.08, 5.15, Math.sin(a) * 2.08),
    );
  }

  for (const y of [5.2, 6.05, 6.9]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.08, 8, 28), mat(band));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    root.add(ring);
  }

  root.add(cone(2.45, 1.25, roofColor, 0, 7.85, 0, 20));
  root.add(box(0.18, 0.45, 0.18, '#3a3a42', 0, 9.05, 0)); // pináculo

  // escada
  const ladder = new THREE.Group();
  ladder.position.set(2.25, 0, 0);
  ladder.add(box(0.1, 5.4, 0.1, woodDark, -0.3, 0));
  ladder.add(box(0.1, 5.4, 0.1, woodDark, 0.3, 0));
  for (let i = 0; i < 12; i++) {
    ladder.add(box(0.75, 0.07, 0.1, band, 0, 0.3 + i * 0.45));
  }
  root.add(ladder);

  // cano de descida
  root.add(cyl(0.12, 0.12, 4.8, '#6a7a8a', -2.15, 0.2, 0.8, 10));
  root.add(box(0.35, 0.2, 0.35, '#6a7a8a', -2.15, 5.0, 0.8));

  return root;
}

const bytes = await exportGlb(buildWatertower(), OUT);
console.log(`[mid-B] watertower.glb (${bytes} bytes)`);
