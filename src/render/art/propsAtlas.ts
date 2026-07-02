import * as THREE from 'three';
import { Palette } from './palette.ts';
import { PROP_CATALOG } from '../../props/catalog.ts';
import { blob, box, dot, px, roof, stem } from './pixelDraw.ts';

export const PROP_CELL_PX = 48;
export const PROP_ATLAS_COLS = 8;

export interface PropAtlas {
  texture: THREE.Texture;
  cols: number;
  rows: number;
  cellPx: number;
}

function drawFlower(ctx: CanvasRenderingContext2D, ox: number, oy: number, petal: string, center = Palette.flowerYellow): void {
  stem(ctx, ox, oy - 4, 22);
  const cx = ox + 24;
  const cy = oy + 20;
  blob(ctx, cx, cy, 5, petal, lighten(petal));
  blob(ctx, cx, cy, 2, center);
  dot(ctx, cx, cy, Palette.outline);
  // petal tips
  for (const [dx, dy] of [[0, -6], [5, -4], [6, 1], [0, 6], [-6, 1], [-5, -4]]) {
    px(ctx, cx + dx - 1, cy + dy - 1, 2, 2, petal);
    dot(ctx, cx + dx, cy + dy, Palette.outline);
  }
}

function lighten(hex: string): string {
  return hex === Palette.flowerWhite ? '#ffffff' : hex;
}

function drawBush(ctx: CanvasRenderingContext2D, ox: number, oy: number, large: boolean): void {
  const r = large ? 11 : 8;
  blob(ctx, ox + 18, oy + 28, r - 2, Palette.leafDark);
  blob(ctx, ox + 30, oy + 26, r - 3, Palette.leaf);
  blob(ctx, ox + 24, oy + 22, r, Palette.leaf, Palette.grass);
  px(ctx, ox + 22, oy + 34, 4, 6, Palette.leafDark);
}

function drawRock(ctx: CanvasRenderingContext2D, ox: number, oy: number, large: boolean): void {
  const w = large ? 22 : 16;
  const h = large ? 14 : 10;
  const x = ox + 24 - w / 2;
  const y = oy + 38 - h;
  px(ctx, x + 2, y + 2, w - 4, h - 2, Palette.stone);
  px(ctx, x, y + 4, w, h - 4, Palette.stone);
  px(ctx, x + 3, y + 1, w - 6, 3, Palette.stoneDark);
  dot(ctx, x, y + h - 1, Palette.outline);
  dot(ctx, x + w - 1, y + 4, Palette.outline);
  if (large) px(ctx, x + 4, y + 3, 4, 2, Palette.leafDark);
}

function drawTreeTrunk(ctx: CanvasRenderingContext2D, ox: number, oy: number, h: number): void {
  box(ctx, ox + 21, oy + 48 - h, 6, h, Palette.woodDark);
  px(ctx, ox + 22, oy + 48 - h + 4, 1, h - 8, Palette.wood);
  px(ctx, ox + 25, oy + 48 - h + 6, 1, h - 10, Palette.wood);
}

function drawTree(ctx: CanvasRenderingContext2D, ox: number, oy: number, kind: string): void {
  if (kind === 'pine') {
    drawTreeTrunk(ctx, ox, oy, 14);
    roof(ctx, ox + 10, oy + 8, 28, 10, Palette.leafDark);
    roof(ctx, ox + 13, oy + 16, 22, 8, Palette.leaf);
    roof(ctx, ox + 16, oy + 22, 16, 7, Palette.leafDark);
    dot(ctx, ox + 24, oy + 8, Palette.outline);
  } else if (kind === 'palm') {
    px(ctx, ox + 22, oy + 18, 4, 18, Palette.woodDark);
    px(ctx, ox + 23, oy + 20, 2, 14, Palette.wood);
    for (const [x, y, w] of [[8, 10, 10], [16, 6, 12], [26, 10, 10], [18, 12, 8]] as const) {
      px(ctx, ox + x, oy + y, w, 3, Palette.leaf);
      px(ctx, ox + x + 1, oy + y + 3, w - 2, 2, Palette.leafDark);
    }
  } else if (kind === 'apple') {
    drawTreeTrunk(ctx, ox, oy, 12);
    blob(ctx, ox + 24, oy + 18, 13, Palette.leaf, Palette.grass);
    blob(ctx, ox + 18, oy + 22, 8, Palette.leafDark);
    blob(ctx, ox + 30, oy + 20, 8, Palette.leafDark);
    dot(ctx, ox + 18, oy + 20, Palette.roofRed);
    dot(ctx, ox + 28, oy + 16, Palette.roofRed);
    dot(ctx, ox + 30, oy + 24, Palette.roofRed);
  } else if (kind === 'cherry') {
    drawTreeTrunk(ctx, ox, oy, 12);
    blob(ctx, ox + 24, oy + 18, 13, Palette.leafDark, Palette.leaf);
    for (const [x, y] of [[16, 16], [22, 14], [28, 18], [20, 22], [26, 22]]) {
      px(ctx, ox + x, oy + y, 3, 3, Palette.flowerPink);
      dot(ctx, ox + x + 1, oy + y + 1, Palette.flowerWhite);
    }
  } else {
    drawTreeTrunk(ctx, ox, oy, 14);
    blob(ctx, ox + 24, oy + 16, 14, Palette.leaf, Palette.grass);
    blob(ctx, ox + 16, oy + 22, 9, Palette.leafDark);
    blob(ctx, ox + 32, oy + 20, 8, Palette.leafDark);
    px(ctx, ox + 20, oy + 12, 8, 4, Palette.grass);
  }
}

function drawHouse(ctx: CanvasRenderingContext2D, ox: number, oy: number, roofColor: string, wide = 2): void {
  const w = wide === 3 ? 44 : 36;
  const x = ox + (48 - w) / 2;
  const wallH = 20;
  const wallY = oy + 22;

  px(ctx, x - 1, wallY + wallH, w + 2, 3, Palette.stoneDark);
  box(ctx, x, wallY, w, wallH, Palette.wall, Palette.outline);
  px(ctx, x + 2, wallY + 2, w - 4, 2, Palette.sandLight);

  const doorW = 8;
  const doorX = x + w / 2 - doorW / 2;
  box(ctx, doorX, wallY + wallH - 12, doorW, 12, Palette.woodDark);
  dot(ctx, doorX + doorW - 2, wallY + wallH - 7, Palette.flowerYellow);

  const winY = wallY + 6;
  for (const wx of [x + 6, x + w - 14]) {
    box(ctx, wx, winY, 8, 8, Palette.waterMid);
    px(ctx, wx + 3, winY, 2, 8, Palette.wall);
    px(ctx, wx, winY + 3, 8, 2, Palette.wall);
    dot(ctx, wx, winY, Palette.outline);
  }

  roof(ctx, x - 3, oy + 10, w + 6, 14, roofColor);
  px(ctx, x + w / 2 - 4, oy + 8, 8, 6, Palette.stone);
  px(ctx, ox + 24, oy + 6, 2, 4, Palette.stoneDark);
}

function drawUtility(ctx: CanvasRenderingContext2D, ox: number, oy: number, id: string): void {
  switch (id) {
    case 'crate':
      box(ctx, ox + 12, oy + 20, 24, 18, Palette.wood);
      px(ctx, ox + 12, oy + 20, 24, 3, Palette.woodDark);
      px(ctx, ox + 23, oy + 24, 2, 12, Palette.woodDark);
      px(ctx, ox + 12, oy + 32, 24, 2, Palette.woodDark);
      break;
    case 'barrel':
      box(ctx, ox + 14, oy + 18, 20, 20, Palette.wood);
      for (const ry of [22, 28, 34]) px(ctx, ox + 14, oy + ry, 20, 2, Palette.woodDark);
      px(ctx, ox + 22, oy + 20, 4, 16, Palette.woodDark);
      break;
    case 'lantern':
      px(ctx, ox + 22, oy + 30, 4, 10, Palette.woodDark);
      box(ctx, ox + 16, oy + 16, 16, 16, Palette.flowerYellow);
      px(ctx, ox + 18, oy + 18, 12, 12, '#fff8c0');
      dot(ctx, ox + 24, oy + 22, Palette.coralOrange);
      break;
    case 'fence':
      for (const fx of [12, 22, 32]) {
        box(ctx, ox + fx, oy + 18, 4, 20, Palette.wood);
        px(ctx, ox + fx + 1, oy + 20, 2, 16, Palette.woodDark);
      }
      px(ctx, ox + 10, oy + 22, 28, 3, Palette.woodDark);
      px(ctx, ox + 10, oy + 32, 28, 3, Palette.wood);
      break;
    case 'umbrella':
      px(ctx, ox + 23, oy + 26, 2, 14, Palette.woodDark);
      for (let i = 0; i < 7; i++) {
        px(ctx, ox + 10 + i * 4, oy + 14 + Math.abs(3 - i), 3, 2, Palette.roofRed);
      }
      px(ctx, ox + 12, oy + 18, 24, 4, Palette.roofRed);
      dot(ctx, ox + 24, oy + 26, Palette.outline);
      break;
    case 'well':
      px(ctx, ox + 6, oy + 16, 36, 24, Palette.stone);
      px(ctx, ox + 8, oy + 18, 32, 3, Palette.stoneDark);
      px(ctx, ox + 12, oy + 24, 24, 12, Palette.waterMid);
      px(ctx, ox + 16, oy + 28, 16, 4, Palette.waterShallow);
      box(ctx, ox + 18, oy + 6, 12, 12, Palette.wood);
      px(ctx, ox + 20, oy + 8, 8, 2, Palette.woodDark);
      break;
    case 'lounger':
      px(ctx, ox + 4, oy + 28, 40, 6, Palette.wood);
      px(ctx, ox + 4, oy + 20, 6, 10, Palette.woodDark);
      px(ctx, ox + 28, oy + 22, 14, 8, Palette.roofBlue);
      px(ctx, ox + 30, oy + 24, 10, 4, Palette.waterMid);
      break;
    case 'light_string':
      px(ctx, ox + 4, oy + 18, 40, 2, Palette.woodDark);
      for (let i = 0; i < 6; i++) {
        px(ctx, ox + 8 + i * 6, oy + 20, 2, 3, Palette.woodDark);
        px(ctx, ox + 7 + i * 6, oy + 22, 4, 4, i % 2 === 0 ? Palette.flowerYellow : Palette.flowerPink);
      }
      break;
    case 'shop':
      drawHouse(ctx, ox - 8, oy, Palette.roofYellow, 3);
      px(ctx, ox + 4, oy + 28, 32, 10, Palette.wall);
      ctx.fillStyle = Palette.flowerWhite;
      ctx.font = 'bold 8px monospace';
      ctx.fillText('SHOP', ox + 8, oy + 36);
      px(ctx, ox + 6, oy + 30, 28, 2, Palette.roofBlue);
      break;
    case 'barn':
      drawHouse(ctx, ox - 8, oy, Palette.roofRed, 3);
      box(ctx, ox + 14, oy + 28, 16, 12, Palette.woodDark);
      px(ctx, ox + 18, oy + 30, 8, 8, Palette.wood);
      roof(ctx, ox + 12, oy + 8, 24, 8, Palette.roofRed);
      break;
    case 'wheelbarrow':
      px(ctx, ox + 14, oy + 28, 18, 4, Palette.wood);
      px(ctx, ox + 28, oy + 30, 4, 4, Palette.stoneDark);
      px(ctx, ox + 12, oy + 24, 10, 6, Palette.woodDark);
      px(ctx, ox + 10, oy + 22, 2, 10, Palette.wood);
      break;
    case 'sign_post':
      px(ctx, ox + 22, oy + 20, 4, 18, Palette.woodDark);
      box(ctx, ox + 12, oy + 12, 24, 12, Palette.wood);
      px(ctx, ox + 14, oy + 16, 20, 2, Palette.woodDark);
      break;
    default:
      box(ctx, ox + 14, oy + 20, 20, 16, Palette.wood);
      px(ctx, ox + 16, oy + 22, 16, 10, Palette.woodDark);
  }
}

function drawPropSprite(ctx: CanvasRenderingContext2D, cellX: number, cellY: number, id: string): void {
  const ox = cellX;
  const oy = cellY;

  if (id.startsWith('flower_')) {
    const colors: Record<string, string> = {
      flower_red: Palette.flowerRed,
      flower_yellow: Palette.flowerYellow,
      flower_white: Palette.flowerWhite,
      flower_pink: Palette.flowerPink,
    };
    drawFlower(ctx, ox, oy, colors[id] ?? Palette.flowerRed);
    return;
  }
  if (id.startsWith('tree_')) {
    drawTree(ctx, ox, oy, id.replace('tree_', ''));
    return;
  }
  if (id.startsWith('house_')) {
    const colors: Record<string, string> = {
      house_red: Palette.roofRed,
      house_blue: Palette.roofBlue,
      house_green: Palette.roofGreen,
      house_yellow: Palette.roofYellow,
    };
    drawHouse(ctx, ox, oy, colors[id] ?? Palette.roofRed);
    return;
  }

  switch (id) {
    case 'bush_small': drawBush(ctx, ox, oy, false); break;
    case 'bush_large': drawBush(ctx, ox, oy, true); break;
    case 'rock_small': drawRock(ctx, ox, oy, false); break;
    case 'rock_large': drawRock(ctx, ox, oy, true); break;
    case 'shell':
      px(ctx, ox + 16, oy + 30, 16, 8, Palette.sandLight);
      for (let i = 0; i < 5; i++) px(ctx, ox + 18 + i * 2, oy + 28 + i, 2, 2, Palette.flowerWhite);
      dot(ctx, ox + 24, oy + 34, Palette.outline);
      break;
    case 'starfish':
      for (let a = 0; a < 5; a++) {
        const ang = (a / 5) * Math.PI * 2 - Math.PI / 2;
        px(ctx, ox + 24 + Math.cos(ang) * 6 - 1, oy + 28 + Math.sin(ang) * 6 - 1, 3, 3, Palette.coralOrange);
      }
      px(ctx, ox + 22, oy + 26, 4, 4, Palette.coral);
      break;
    case 'grass_tuft':
      for (const gx of [19, 23, 27]) {
        px(ctx, ox + gx, oy + 30, 2, 8, Palette.leafDark);
        dot(ctx, ox + gx, oy + 30, Palette.leaf);
      }
      break;
    case 'mushroom':
      px(ctx, ox + 21, oy + 30, 6, 8, Palette.flowerWhite);
      blob(ctx, ox + 24, oy + 24, 7, Palette.roofRed, Palette.coralOrange);
      px(ctx, ox + 20, oy + 22, 3, 2, Palette.flowerWhite);
      px(ctx, ox + 26, oy + 21, 2, 2, Palette.flowerWhite);
      break;
    case 'clover':
      stem(ctx, ox, oy, 16);
      for (const [dx, dy] of [[-4, -2], [2, -4], [4, 0]]) blob(ctx, ox + 24 + dx, oy + 28 + dy, 3, Palette.leaf);
      break;
    case 'fern':
      stem(ctx, ox, oy, 18);
      for (let i = 0; i < 4; i++) {
        px(ctx, ox + 16 + i * 3, oy + 14 + i * 2, 3, 10 - i, Palette.leaf);
        px(ctx, ox + 28 - i * 3, oy + 14 + i * 2, 3, 10 - i, Palette.leafDark);
      }
      break;
    case 'pebble':
      px(ctx, ox + 20, oy + 33, 8, 5, Palette.stone);
      px(ctx, ox + 21, oy + 33, 4, 2, Palette.sandLight);
      break;
    case 'driftwood':
      px(ctx, ox + 10, oy + 32, 28, 6, Palette.wood);
      px(ctx, ox + 12, oy + 33, 8, 2, Palette.woodDark);
      px(ctx, ox + 24, oy + 34, 6, 2, Palette.woodDark);
      break;
    case 'coral_piece':
      px(ctx, ox + 18, oy + 20, 4, 14, Palette.coral);
      px(ctx, ox + 24, oy + 24, 4, 10, Palette.coralOrange);
      px(ctx, ox + 28, oy + 28, 3, 8, Palette.coral);
      dot(ctx, ox + 18, oy + 20, Palette.outline);
      break;
    case 'lily':
      px(ctx, ox + 14, oy + 32, 20, 6, Palette.leaf);
      px(ctx, ox + 20, oy + 30, 8, 4, Palette.leafDark);
      drawFlower(ctx, ox, oy + 4, Palette.flowerWhite, Palette.flowerYellow);
      break;
    case 'tulip':
      stem(ctx, ox, oy, 20);
      px(ctx, ox + 20, oy + 12, 8, 10, Palette.flowerRed);
      px(ctx, ox + 22, oy + 10, 4, 4, Palette.flowerPink);
      px(ctx, ox + 21, oy + 14, 2, 6, Palette.flowerRed);
      break;
    case 'daisy':
      drawFlower(ctx, ox, oy, Palette.flowerWhite, Palette.flowerYellow);
      break;
    case 'barn':
    case 'shop':
      drawUtility(ctx, ox, oy, id);
      break;
    default:
      drawUtility(ctx, ox, oy, id);
  }
}

let cachedAtlas: PropAtlas | null = null;

export async function loadPropsAtlasFromImage(url: string): Promise<PropAtlas> {
  if (cachedAtlas) return cachedAtlas;

  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.premultiplyAlpha = false;

        const count = PROP_CATALOG.length;
        const cols = PROP_ATLAS_COLS;
        const rows = Math.ceil(count / cols);

        cachedAtlas = { texture, cols, rows, cellPx: PROP_CELL_PX };
        resolve(cachedAtlas);
      },
      undefined,
      (err) => {
        console.warn(`Failed to load props atlas from ${url}, falling back to procedural.`, err);
        resolve(buildPropsAtlas());
      }
    );
  });
}

/** Force rebuild on next access (e.g. after art edits during dev). */
export function invalidatePropsAtlasCache(): void {
  cachedAtlas = null;
}

export function buildPropsAtlas(): PropAtlas {
  if (cachedAtlas) return cachedAtlas;

  const count = PROP_CATALOG.length;
  const cols = PROP_ATLAS_COLS;
  const rows = Math.ceil(count / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * PROP_CELL_PX;
  canvas.height = rows * PROP_CELL_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const def of PROP_CATALOG) {
    const col = def.atlasIndex % cols;
    const row = Math.floor(def.atlasIndex / cols);
    const cellX = col * PROP_CELL_PX;
    const cellY = row * PROP_CELL_PX;
    ctx.clearRect(cellX, cellY, PROP_CELL_PX, PROP_CELL_PX);
    drawPropSprite(ctx, cellX, cellY, def.id);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.premultiplyAlpha = false;

  cachedAtlas = { texture, cols, rows, cellPx: PROP_CELL_PX };
  return cachedAtlas;
}
