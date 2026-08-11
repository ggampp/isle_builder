import * as THREE from 'three';
import { MaskBit } from '../world/autotiler.ts';

const ATLAS_COLS = 16;
const ATLAS_ROWS = 16;
const CELL_PIXELS = 64;

/**
 * Desenha um dos 4 quadrantes de uma célula do atlas (canto do tile),
 * dado se ele conecta às duas arestas adjacentes e à diagonal. Área não
 * preenchida fica transparente de propósito: é assim que a camada de
 * baixo (água ou areia) aparece por baixo desta, sem precisar saber a
 * cor dela — só a ordem de desenho (Ocean → Sand → Grass) importa.
 */
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
    fillQuadrantRect();
    if (!connectCorner) {
      // Vizinho diagonal é de outra camada: entalha um canto côncavo.
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
    // Conecta só a uma das arestas: metade do quadrante, cortada na diagonal.
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

  // Isolado: nem aresta conecta — só um núcleo pequeno perto do centro do tile.
  const inset = half * 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + signX * inset, cy);
  ctx.lineTo(cx, cy + signY * inset);
  ctx.closePath();
  ctx.fill();
}

/**
 * Atlas placeholder 16×16 (256 células = índice direto pela mask 0-255):
 * cada célula é o blob de cor chapada correspondente àquela combinação de
 * vizinhos. Substituído por arte pixel final na Sprint 05.
 */
export function generateBlobAtlasTexture(fillColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * CELL_PIXELS;
  canvas.height = ATLAS_ROWS * CELL_PIXELS;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível para gerar atlas placeholder');

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

    // Canvas y cresce para baixo = mundo Sul (ver convenção em autotiler.ts).
    drawQuadrant(ctx, cellX, cellY, half, -1, -1, w, n, nw, fillColor); // quadrante NW
    drawQuadrant(ctx, cellX, cellY, half, 1, -1, e, n, ne, fillColor); // quadrante NE
    drawQuadrant(ctx, cellX, cellY, half, -1, 1, w, s, sw, fillColor); // quadrante SW
    drawQuadrant(ctx, cellX, cellY, half, 1, 1, e, s, se, fillColor); // quadrante SE
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

export const ATLAS_GRID_COLS = ATLAS_COLS;
export const ATLAS_GRID_ROWS = ATLAS_ROWS;
