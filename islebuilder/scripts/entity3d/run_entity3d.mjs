/**
 * Exporta GLBs de entidades 3D para public/assets/models/entities/.
 *
 * Uso:
 *   node scripts/entity3d/run_entity3d.mjs
 *   node scripts/entity3d/run_entity3d.mjs villager fish
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEntity3d, listEntity3dIds } from './geometry.mjs';
import { exportPropGlb } from '../prop3d/export_glb.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'public/assets/models/entities');
const GEN_DIR = path.join(ROOT, 'assets/generated/entity3d/glb');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(GEN_DIR, { recursive: true });

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ids = args.length > 0 ? args : listEntity3dIds();

console.log(`[entity3d] exporting ${ids.length} models → ${OUT_DIR}`);

for (const id of ids) {
  const root = buildEntity3d(id);
  const genPath = path.join(GEN_DIR, `${id}.glb`);
  const outPath = path.join(OUT_DIR, `${id}.glb`);
  const bytes = await exportPropGlb(root, genPath);
  fs.copyFileSync(genPath, outPath);
  console.log(`  [glb] ${id} (${bytes} bytes)`);
}

console.log('[entity3d] ok');
