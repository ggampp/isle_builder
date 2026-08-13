/**
 * Pipeline prop3d: geometria → GLB (público + gerado) → render 3/4 opcional → célula atlas.
 *
 * Uso:
 *   node scripts/prop3d/run_prop3d.mjs tree_palm
 *   node scripts/prop3d/run_prop3d.mjs --all
 *   node scripts/prop3d/run_prop3d.mjs tree_palm --stitch
 *   node scripts/prop3d/run_prop3d.mjs --list
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProp3d, listProp3dIds } from './geometry.mjs';
import { exportPropGlb } from './export_glb.mjs';
import { renderSolidsToJimp } from './render_cell.mjs';
import { processSpriteToCell } from '../muapi_lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

async function cropToOpaque(img) {
  const { width, height, data } = img.bitmap;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return img;
  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  return img.clone().crop(minX, minY, maxX - minX + 1, maxY - minY + 1);
}

async function bakeOne(id, { doAtlas = true, doStitch = false } = {}) {
  const { root, solids, bottomAlign = true, cellPx = 64 } = buildProp3d(id);

  const glbDir = path.join(ROOT, 'assets/generated/prop3d/glb');
  const publicDir = path.join(ROOT, 'public/assets/models/props');
  const rawDir = path.join(ROOT, 'assets/generated/prop3d/raw');
  const propsDir = path.join(ROOT, 'assets/generated/props');
  fs.mkdirSync(glbDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(propsDir, { recursive: true });

  const glbPath = path.join(glbDir, `${id}.glb`);
  const publicPath = path.join(publicDir, `${id}.glb`);
  const bytes = await exportPropGlb(root, glbPath);
  fs.copyFileSync(glbPath, publicPath);
  console.log(`[glb] ${id} -> ${publicPath} (${bytes} bytes)`);

  if (doAtlas) {
    const rawPath = path.join(rawDir, `${id}.png`);
    const cellPath = path.join(propsDir, `${id}.png`);
    const hiRes = await renderSolidsToJimp(solids, { size: 256, yaw: 0.55, elev: 0.82, padding: 10 });
    const cropped = await cropToOpaque(hiRes);
    await cropped.writeAsync(rawPath);
    await processSpriteToCell(rawPath, cellPath, cellPx, { bottomAlign });
    console.log(`[cell] ${id} -> ${cellPath}`);
  }

  if (doStitch) {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/stitch_atlases.mjs'), 'props'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
    console.log(`[stitch] public/assets/atlas/props-atlas.png atualizado`);
  }
}

const args = process.argv.slice(2);
if (args.includes('--list')) {
  console.log('Props prop3d disponíveis:');
  for (const id of listProp3dIds()) console.log(`  - ${id}`);
  process.exit(0);
}

if (args.includes('--all')) {
  const skipAtlas = args.includes('--glb-only');
  const ids = listProp3dIds();
  console.log(`[prop3d] baking ${ids.length} props${skipAtlas ? ' (glb only)' : ''}...`);
  for (const id of ids) {
    // Cada bake clona root — rebuild fresco
    await bakeOne(id, { doAtlas: !skipAtlas, doStitch: false });
  }
  if (!skipAtlas && args.includes('--stitch')) {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/stitch_atlases.mjs'), 'props'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
  console.log('[prop3d] ok — all');
  process.exit(0);
}

if (args.length === 0) {
  console.log('Uso: node scripts/prop3d/run_prop3d.mjs <id|--all> [--stitch] [--glb-only]');
  process.exit(1);
}

const id = args.find((a) => !a.startsWith('--'));
const doStitch = args.includes('--stitch');
const skipAtlas = args.includes('--glb-only');
if (!id) {
  console.error('Informe o id do prop.');
  process.exit(1);
}

await bakeOne(id, { doAtlas: !skipAtlas, doStitch });
console.log('[prop3d] ok');
