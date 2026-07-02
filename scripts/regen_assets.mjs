/** Regenerate specific assets and restitch atlases. */
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv, generateAndProcess } from './muapi_lib.mjs';
import { PROP_PROMPTS, ENTITY_PROMPTS } from './asset_prompts.mjs';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

loadEnv();

const jobs = [
  { id: 'coral_piece', prompt: PROP_PROMPTS.coral_piece, rawDir: 'props', outDir: 'props', cellPx: 48 },
  { id: 'villager', prompt: ENTITY_PROMPTS.villager, rawDir: 'entities', outDir: 'entities', cellPx: 32 },
];

for (const job of jobs) {
  await generateAndProcess({
    id: job.id,
    prompt: job.prompt,
    rawDir: path.join(ROOT, 'assets/generated/raw', job.rawDir),
    outDir: path.join(ROOT, 'assets/generated', job.outDir),
    cellPx: job.cellPx,
    skipExisting: false,
  });
}

await new Promise((resolve, reject) => {
  const p = spawn('node', [path.join(__dirname, 'stitch_atlases.mjs'), 'all'], {
    stdio: 'inherit',
    cwd: ROOT,
  });
  p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`stitch ${code}`))));
});

console.log('Regen complete.');