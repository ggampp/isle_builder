/**
 * Regenerate only listed prop ids (deletes raw+processed, then calls MuAPI).
 * Usage: node scripts/regen_props_subset.mjs house_red barn shop
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ROOT, loadEnv, generateAndProcess } from './muapi_lib.mjs';
import { PROP_PROMPTS } from './asset_prompts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv();

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('Usage: node scripts/regen_props_subset.mjs <prop_id> [...]');
  process.exit(1);
}

const treeIds = new Set(['tree_oak', 'tree_pine', 'tree_palm', 'tree_apple', 'tree_cherry']);
const rawDir = path.join(ROOT, 'assets/generated/raw/props');
const outDir = path.join(ROOT, 'assets/generated/props');

for (const id of ids) {
  const prompt = PROP_PROMPTS[id];
  if (!prompt) {
    console.warn(`[skip] no prompt for ${id}`);
    continue;
  }
  for (const p of [path.join(rawDir, `${id}.png`), path.join(outDir, `${id}.png`)]) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  await generateAndProcess({
    id,
    prompt,
    rawDir,
    outDir,
    cellPx: 64,
    bottomAlign: treeIds.has(id),
    skipExisting: false,
  });
}

console.log('[done] subset regen');