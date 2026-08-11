import * as THREE from 'three';
import { MaskBit } from '../../world/autotiler.ts';
import { TERRAIN_MASK_CELL_PX } from './worldScale.ts';
import { Palette } from './palette.ts';

const ATLAS_COLS = 16;
const ATLAS_ROWS = 16;
const CELL_PIXELS = TERRAIN_MASK_CELL_PX;

export type TerrainKind = 'sand' | 'grass' | 'path' | 'bridge' | 'cliff';

/** Bezier control-point factor that approximates a circular arc (~0.55% error over a 90° sweep). */
const ARC_KAPPA = 0.5523;

/** Cubic-bezier approximation of a quarter-circle arc centered at (ccx, ccy) from A to B. */
function quarterArcTo(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  ccx: number,
  ccy: number,
): void {
  const c1x = ax + (bx - ccx) * ARC_KAPPA;
  const c1y = ay + (by - ccy) * ARC_KAPPA;
  const c2x = bx + (ax - ccx) * ARC_KAPPA;
  const c2y = by + (ay - ccy) * ARC_KAPPA;
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, bx, by);
}

/** Cuts a rounded notch of the given radius out of the corner at (outerX, outerY). */
function cutRoundedCorner(
  ctx: CanvasRenderingContext2D,
  outerX: number,
  outerY: number,
  signX: 1 | -1,
  signY: 1 | -1,
  radius: number,
): void {
  const ax = outerX - signX * radius;
  const ay = outerY;
  const bx = outerX;
  const by = outerY - signY * radius;

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.moveTo(outerX, outerY);
  ctx.lineTo(ax, ay);
  quarterArcTo(ctx, ax, ay, bx, by, outerX, outerY);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function drawQuadrant(
  ctx: CanvasRenderingContext2D,
  cellX: number,
  cellY: number,
  half: number,
  signX: 1 | -1,
  signY: 1 | -1,
  connectH: boolean,
  connectV: boolean,
  connectCorner: boolean,
  fillColor: string,
): void {
  const cx = cellX + half;
  const cy = cellY + half;
  const outerX = cx + signX * half;
  const outerY = cy + signY * half;
  const midHX = outerX;
  const midHY = cy;
  const midVX = cx;
  const midVY = outerY;

  ctx.fillStyle = fillColor;

  const fillQuadrantRect = (): void => {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(midVX, midVY);
    ctx.lineTo(outerX, outerY);
    ctx.lineTo(midHX, midHY);
    ctx.closePath();
    ctx.fill();
  };

  if (connectH && connectV) {
    // Interior corner: solid, unless the diagonal neighbor is missing — then a
    // small rounded notch (concave curve) instead of the old sharp diagonal cut.
    fillQuadrantRect();
    if (!connectCorner) {
      cutRoundedCorner(ctx, outerX, outerY, signX, signY, half * 0.42);
    }
    return;
  }

  if (connectH || connectV) {
    // Coastline running straight through this quadrant: fill it solid and only
    // round off the exposed outer tip, instead of retreating all the way to
    // the tile center — that retreat is what produced the sawtooth coastline.
    fillQuadrantRect();
    cutRoundedCorner(ctx, outerX, outerY, signX, signY, half * 0.62);
    return;
  }

  // Isolated corner (no support on either side): this quadrant contributes one
  // quarter-slice of a small rounded nub (the other 3 quadrants add the rest).
  const r = half * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + signX * r, cy);
  quarterArcTo(ctx, cx + signX * r, cy, cx, cy + signY * r, cx, cy);
  ctx.closePath();
  ctx.fill();
}

function cellHash01(px: number, py: number, salt: number): number {
  let h = (px * 374761393 + py * 668265263 + salt * 982451653) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = (h * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function setPx(d: Uint8ClampedArray, i: number, rgb: [number, number, number]): void {
  d[i] = rgb[0];
  d[i + 1] = rgb[1];
  d[i + 2] = rgb[2];
}

function blendPx(d: Uint8ClampedArray, i: number, rgb: [number, number, number], t: number): void {
  d[i] = Math.round(d[i]! * (1 - t) + rgb[0] * t);
  d[i + 1] = Math.round(d[i + 1]! * (1 - t) + rgb[1] * t);
  d[i + 2] = Math.round(d[i + 2]! * (1 - t) + rgb[2] * t);
}

const SAND_LIGHT = parseHex(Palette.sandLight);
const SAND_DARK = parseHex(Palette.sandDark);
const GRASS_LIGHT = parseHex(Palette.grassLight);
const GRASS_DARK = parseHex(Palette.grassDark);
const FLOWER_YELLOW = parseHex(Palette.flowerYellow);
const FLOWER_PINK = parseHex(Palette.flowerPink);
const FLOWER_WHITE = parseHex(Palette.flowerWhite);

function applySandTexture(ctx: CanvasRenderingContext2D, cellX: number, cellY: number): void {
  const img = ctx.getImageData(cellX, cellY, CELL_PIXELS, CELL_PIXELS);
  const d = img.data;
  for (let py = 0; py < CELL_PIXELS; py++) {
    for (let px = 0; px < CELL_PIXELS; px++) {
      const i = (py * CELL_PIXELS + px) * 4;
      if (d[i + 3]! < 10) continue;
      const h = cellHash01(cellX + px, cellY + py, 11);
      // Kept subtle on purpose: this grain is baked once per shared atlas cell, so
      // every tile using the same mask repeats it identically — too strong and it
      // reads as a mechanical tiling "wallpaper" dot-grid instead of organic grain.
      if (h < 0.025) blendPx(d, i, SAND_DARK, 0.14);
      else if (h < 0.05) blendPx(d, i, SAND_LIGHT, 0.14);
    }
  }
  ctx.putImageData(img, cellX, cellY);
}

function applyGrassTexture(ctx: CanvasRenderingContext2D, cellX: number, cellY: number): void {
  const img = ctx.getImageData(cellX, cellY, CELL_PIXELS, CELL_PIXELS);
  const d = img.data;
  for (let py = 0; py < CELL_PIXELS; py++) {
    for (let px = 0; px < CELL_PIXELS; px++) {
      const i = (py * CELL_PIXELS + px) * 4;
      if (d[i + 3]! < 10) continue;
      const gx = cellX + px;
      const gy = cellY + py;
      const h = cellHash01(gx, gy, 23);

      if (h < 0.01) {
        const f = cellHash01(gx, gy, 29);
        if (f < 0.4) setPx(d, i, FLOWER_YELLOW);
        else if (f < 0.7) setPx(d, i, FLOWER_PINK);
        else setPx(d, i, FLOWER_WHITE);
        continue;
      }
      // Same "shared atlas cell repeats" caveat as applySandTexture — kept subtle.
      if (h < 0.05) blendPx(d, i, GRASS_DARK, 0.16);
      else if (h < 0.09) blendPx(d, i, GRASS_LIGHT, 0.12);
    }
  }
  ctx.putImageData(img, cellX, cellY);
}

function applyGenericNoise(ctx: CanvasRenderingContext2D, cellX: number, cellY: number, amount: number): void {
  const img = ctx.getImageData(cellX, cellY, CELL_PIXELS, CELL_PIXELS);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3]! < 10) continue;
    const n = ((i / 4) % 7) - 3;
    d[i] = Math.max(0, Math.min(255, d[i]! + n * amount));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n * amount));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n * amount));
  }
  ctx.putImageData(img, cellX, cellY);
}

/** Terrain blob atlas tuned to match the reference game (warm sand + speckled grass). */
export function generateTerrainAtlasTexture(
  baseColor: string,
  _darkColor: string,
  kind: TerrainKind = 'path',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * CELL_PIXELS;
  canvas.height = ATLAS_ROWS * CELL_PIXELS;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  const half = CELL_PIXELS / 2;

  for (let mask = 0; mask < ATLAS_COLS * ATLAS_ROWS; mask++) {
    const col = mask % ATLAS_COLS;
    const row = Math.floor(mask / ATLAS_COLS);
    const cellX = col * CELL_PIXELS;
    const cellY = row * CELL_PIXELS;

    const n = (mask & MaskBit.N) !== 0;
    const s = (mask & MaskBit.S) !== 0;
    const e = (mask & MaskBit.E) !== 0;
    const w = (mask & MaskBit.W) !== 0;
    const ne = (mask & MaskBit.NE) !== 0;
    const nw = (mask & MaskBit.NW) !== 0;
    const se = (mask & MaskBit.SE) !== 0;
    const sw = (mask & MaskBit.SW) !== 0;

    drawQuadrant(ctx, cellX, cellY, half, -1, -1, w, n, nw, baseColor);
    drawQuadrant(ctx, cellX, cellY, half, 1, -1, e, n, ne, baseColor);
    drawQuadrant(ctx, cellX, cellY, half, -1, 1, w, s, sw, baseColor);
    drawQuadrant(ctx, cellX, cellY, half, 1, 1, e, s, se, baseColor);

    if (kind === 'sand') applySandTexture(ctx, cellX, cellY);
    else if (kind === 'grass') applyGrassTexture(ctx, cellX, cellY);
    else applyGenericNoise(ctx, cellX, cellY, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  // magFilter stays Nearest for crisp pixel edges when zoomed in; minFilter needs
  // mipmapping or the per-pixel grain noise aliases into a hard dot-grid Moiré
  // pattern once a 64px cell is minified onto a ~16px tile (default zoom) — this
  // was a real contributor to the "muito pixelado" look, not just the coastline.
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

export const TERRAIN_ATLAS_COLS = ATLAS_COLS;
export const TERRAIN_ATLAS_ROWS = ATLAS_ROWS;

/** Colors sampled/tuned from assets/status/jogo_exemplo.png */
export const TerrainColors = {
  sand: { base: Palette.sand, dark: Palette.sandDark },
  grass: { base: Palette.grass, dark: Palette.grassDark },
  path: { base: Palette.path, dark: Palette.woodDark },
  bridge: { base: Palette.wood, dark: Palette.woodDark },
  cliff: { base: Palette.cliff, dark: Palette.cliffDark },
} as const;