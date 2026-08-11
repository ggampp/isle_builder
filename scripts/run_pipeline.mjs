/**
 * Full MuAPI asset pipeline for Isle Builder.
 *
 * Usage:
 *   node scripts/run_pipeline.mjs              # all phases
 *   node scripts/run_pipeline.mjs props        # props only
 *   node scripts/run_pipeline.mjs --no-skip    # regenerate existing
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ROOT,
  loadEnv,
  generateAndProcess,
  muapiGenerate,
  downloadUrl,
  processSpriteToCell,
  STYLE_PREFIX,
} from './muapi_lib.mjs';
import {
  PROP_PROMPTS,
  UI_PROMPTS,
  ENTITY_PROMPTS,
  STYLE_BOARD_PROMPT,
  LOGO_PROMPT,
} from './asset_prompts.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadEnv();

const args = process.argv.slice(2);
const skipExisting = !args.includes('--no-skip');
const phases = args.filter((a) => !a.startsWith('--'));
const runAll = phases.length === 0;
const shouldRun = (name) => runAll || phases.includes(name);

const RAW = path.join(ROOT, 'assets/generated/raw');
const PROPS_OUT = path.join(ROOT, 'assets/generated/props');
const UI_OUT = path.join(ROOT, 'assets/generated/ui');
const ENT_OUT = path.join(ROOT, 'assets/generated/entities');

async function phaseStyleBoard() {
  console.log('\n=== Phase: style-board ===');
  const out = path.join(ROOT, 'assets/concepts/style-board.png');
  if (skipExisting && fs.existsSync(out)) {
    console.log('[skip] style-board');
    return;
  }
  const { url } = await muapiGenerate({
    prompt: STYLE_PREFIX + STYLE_BOARD_PROMPT,
    size: '1024*1024',
  });
  await downloadUrl(url, out);
  console.log(`[done] style-board -> ${out}`);
}

async function phaseLogo() {
  console.log('\n=== Phase: logo ===');
  const out = path.join(ROOT, 'public/assets/logo.png');
  const raw = path.join(RAW, 'logo.png');
  if (skipExisting && fs.existsSync(out) && fs.statSync(out).size > 5000) {
    console.log('[skip] logo');
    return;
  }
  const { url } = await muapiGenerate({
    prompt: STYLE_PREFIX + LOGO_PROMPT,
    size: '1024*512',
  });
  await downloadUrl(url, raw);
  // Logo is wide — scale to ~240x80 max, keep aspect
  const Jimp = (await import('jimp')).default;
  let img = await Jimp.read(raw);
  img.scaleToFit(480, 160, Jimp.RESIZE_NEAREST_NEIGHBOR);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await img.writeAsync(out);
  console.log(`[done] logo -> ${out}`);
}

async function phaseProps() {
  console.log('\n=== Phase: props (53) ===');
  const props = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/props/props.json'), 'utf8'));
  const treeIds = new Set(['tree_oak', 'tree_pine', 'tree_palm', 'tree_apple', 'tree_cherry']);
  for (const { id } of props) {
    const prompt = PROP_PROMPTS[id];
    if (!prompt) {
      console.warn(`[warn] no prompt for ${id}`);
      continue;
    }
    await generateAndProcess({
      id,
      prompt,
      rawDir: path.join(RAW, 'props'),
      outDir: PROPS_OUT,
      cellPx: 64,
      bottomAlign: treeIds.has(id),
      skipExisting,
    });
  }
}

async function phaseUi() {
  console.log('\n=== Phase: ui icons ===');
  for (const [id, prompt] of Object.entries(UI_PROMPTS)) {
    await generateAndProcess({
      id,
      prompt,
      rawDir: path.join(RAW, 'ui'),
      outDir: UI_OUT,
      cellPx: 32,
      skipExisting,
    });
  }
}

async function phaseEntities() {
  console.log('\n=== Phase: entities ===');
  for (const [id, prompt] of Object.entries(ENTITY_PROMPTS)) {
    await generateAndProcess({
      id,
      prompt,
      rawDir: path.join(RAW, 'entities'),
      outDir: ENT_OUT,
      cellPx: 32,
      skipExisting,
    });
  }
}

async function stitch() {
  console.log('\n=== Phase: stitch atlases ===');
  const { spawn } = await import('child_process');
  await new Promise((resolve, reject) => {
    const p = spawn('node', [path.join(__dirname, 'stitch_atlases.mjs'), 'all'], {
      stdio: 'inherit',
      cwd: ROOT,
    });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`stitch exit ${code}`))));
  });
}

async function main() {
  console.log('Isle Builder — MuAPI asset pipeline');
  console.log(`skipExisting=${skipExisting}`);

  if (shouldRun('style-board')) await phaseStyleBoard();
  if (shouldRun('logo')) await phaseLogo();
  if (shouldRun('props')) await phaseProps();
  if (shouldRun('ui')) await phaseUi();
  if (shouldRun('entities')) await phaseEntities();

  if (shouldRun('stitch') || runAll || phases.some((p) => ['props', 'ui', 'entities'].includes(p))) {
    await stitch();
  }

  console.log('\n=== Pipeline complete ===');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});