/**
 * Stitch processed sprites into game atlases (props + entities).
 * Reads props.json order for prop atlas grid.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Jimp from 'jimp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PROP_COLS = 8;
/** Must match PROP_CELL_PX in src/render/art/propsAtlas.ts */
const PROP_CELL = 64;
const ENTITY_COLS = 16;
const ENTITY_CELL = 32;

const ENTITY_ROWS = [
  { id: 'villager', frames: 4 },
  { id: 'fish', frames: 4 },
  { id: 'whale', frames: 4 },
  { id: 'shark', frames: 4 },
  { id: 'orca', frames: 4 },
  { id: 'swordfish', frames: 4 },
  { id: 'rowboat', frames: 2 },
  { id: 'galleon', frames: 4 },
  { id: 'spray', frames: 1 },
];

async function stitchProps() {
  const props = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/props/props.json'), 'utf8'));
  const srcDir = path.join(ROOT, 'assets/generated/props');
  const rows = Math.ceil(props.length / PROP_COLS);
  const atlas = new Jimp(PROP_COLS * PROP_CELL, rows * PROP_CELL, 0x00000000);

  let placed = 0;
  for (let i = 0; i < props.length; i++) {
    const id = props[i].id;
    const src = path.join(srcDir, `${id}.png`);
    if (!fs.existsSync(src)) {
      console.warn(`[props] missing ${id}`);
      continue;
    }
    const sprite = await Jimp.read(src);
    const col = i % PROP_COLS;
    const row = Math.floor(i / PROP_COLS);
    atlas.composite(sprite, col * PROP_CELL, row * PROP_CELL);
    placed++;
  }

  const out = path.join(ROOT, 'public/assets/atlas/props-atlas.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await atlas.writeAsync(out);
  console.log(`[props atlas] ${placed}/${props.length} -> ${out}`);
}

async function stitchEntities() {
  const srcDir = path.join(ROOT, 'assets/generated/entities');
  const atlas = new Jimp(ENTITY_COLS * ENTITY_CELL, ENTITY_ROWS.length * ENTITY_CELL, 0x00000000);

  for (let row = 0; row < ENTITY_ROWS.length; row++) {
    const { id, frames } = ENTITY_ROWS[row];
    const src = path.join(srcDir, `${id}.png`);
    if (!fs.existsSync(src)) {
      console.warn(`[entities] missing ${id}`);
      continue;
    }
    const sprite = await Jimp.read(src);
    for (let f = 0; f < frames; f++) {
      atlas.composite(sprite, f * ENTITY_CELL, row * ENTITY_CELL);
    }
  }

  const out = path.join(ROOT, 'public/assets/atlas/entity-atlas.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await atlas.writeAsync(out);
  console.log(`[entity atlas] -> ${out}`);
}

async function copyUiIcons() {
  const srcDir = path.join(ROOT, 'assets/generated/ui');
  const destDir = path.join(ROOT, 'public/assets/ui/icons');
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  let n = 0;
  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith('.png')) continue;
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    n++;
  }
  console.log(`[ui icons] copied ${n} -> ${destDir}`);
}

const phase = process.argv[2] ?? 'all';
if (phase === 'props' || phase === 'all') await stitchProps();
if (phase === 'entities' || phase === 'all') await stitchEntities();
if (phase === 'ui' || phase === 'all') await copyUiIcons();