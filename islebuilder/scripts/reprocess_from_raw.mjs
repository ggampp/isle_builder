/**
 * Re-fit raw MuAPI PNGs into atlas cells (e.g. after changing cellPx to 64).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT, processSpriteToCell } from './muapi_lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROP_CELL = 64;
const ENTITY_CELL = 32;
const treeIds = new Set(['tree_oak', 'tree_pine', 'tree_palm', 'tree_apple', 'tree_cherry']);

async function reprocessDir(rawDir, outDir, cellPx, bottomAlignIds = new Set()) {
  if (!fs.existsSync(rawDir)) return 0;
  let n = 0;
  for (const file of fs.readdirSync(rawDir)) {
    if (!file.endsWith('.png')) continue;
    const id = file.replace(/\.png$/, '');
    const raw = path.join(rawDir, file);
    const out = path.join(outDir, `${id}.png`);
    await processSpriteToCell(raw, out, cellPx, { bottomAlign: bottomAlignIds.has(id) });
    n++;
  }
  return n;
}

const props = await reprocessDir(
  path.join(ROOT, 'assets/generated/raw/props'),
  path.join(ROOT, 'assets/generated/props'),
  PROP_CELL,
  treeIds,
);
const entities = await reprocessDir(
  path.join(ROOT, 'assets/generated/raw/entities'),
  path.join(ROOT, 'assets/generated/entities'),
  ENTITY_CELL,
);
console.log(`[reprocess] props=${props} entities=${entities} (prop cell ${PROP_CELL}px)`);