import * as THREE from 'three';
import { MaskBit } from '../../world/autotiler.ts';
import { Palette } from './palette.ts';

const ATLAS_COLS = 16;
const ATLAS_ROWS = 16;
const CELL_PIXELS = 64;

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
  darkColor: string,
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
    if (connectH && connectV) {
      ctx.fillStyle = darkColor;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = fillColor;
    }
  };

  if (connectH && connectV) {
    fillQuadrantRect();
    if (!connectCorner) {
      const cut = half * 0.45;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(outerX, outerY);
      ctx.lineTo(outerX - signX * cut, outerY);
      ctx.lineTo(outerX, outerY - signY * cut);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    return;
  }

  if (connectH || connectV) {
    const midX = connectH ? midHX : midVX;
    const midY = connectH ? midHY : midVY;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(midX, midY);
    ctx.lineTo(outerX, outerY);
    ctx.closePath();
    ctx.fill();
    return;
  }

  const inset = half * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + signX * inset, cy);
  ctx.lineTo(cx, cy + signY * inset);
  ctx.closePath();
  ctx.fill();
}

function addNoise(ctx: CanvasRenderingContext2D, cellX: number, cellY: number, amount: number): void {
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

/** Final terrain blob atlas with palette colors and subtle dither. */
export function generateTerrainAtlasTexture(baseColor: string, darkColor: string): THREE.CanvasTexture {
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

    drawQuadrant(ctx, cellX, cellY, half, -1, -1, w, n, nw, baseColor, darkColor);
    drawQuadrant(ctx, cellX, cellY, half, 1, -1, e, n, ne, baseColor, darkColor);
    drawQuadrant(ctx, cellX, cellY, half, -1, 1, w, s, sw, baseColor, darkColor);
    drawQuadrant(ctx, cellX, cellY, half, 1, 1, e, s, se, baseColor, darkColor);
    addNoise(ctx, cellX, cellY, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

export const TERRAIN_ATLAS_COLS = ATLAS_COLS;
export const TERRAIN_ATLAS_ROWS = ATLAS_ROWS;

export const TerrainColors = {
  sand: { base: Palette.sand, dark: Palette.sandLight },
  grass: { base: Palette.grass, dark: Palette.grassDark },
  path: { base: Palette.path, dark: Palette.woodDark },
  bridge: { base: Palette.wood, dark: Palette.woodDark },
  cliff: { base: Palette.cliff, dark: Palette.cliffDark },
} as const;
