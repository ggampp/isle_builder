import * as THREE from 'three';
import { Palette } from './palette.ts';
import { PROP_CATALOG } from '../../props/catalog.ts';
import { box, dot, px } from './pixelDraw.ts';

export const PROP_CELL_PX = 64;
export const PROP_ATLAS_COLS = 8;

export interface PropAtlas {
  texture: THREE.Texture;
  cols: number;
  rows: number;
  cellPx: number;
}

/** Linha do chão dentro da célula — os "pés" do prop ficam aqui. */
const G = 58;

// ---------------------------------------------------------------------------
// Helpers de desenho (grid 64×64)
// ---------------------------------------------------------------------------

/** Clareia (factor > 1) ou escurece (factor < 1) uma cor hex. */
function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * factor));
  const b = Math.min(255, Math.round((n & 255) * factor));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function blobFill(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) px(ctx, cx + dx, cy + dy, 1, 1, color);
    }
  }
}

/** Esfera sombreada com contorno: luz no topo-esquerda, sombra embaixo-direita. */
function orb(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  base: string,
  light = shade(base, 1.22),
  dark = shade(base, 0.72),
): void {
  blobFill(ctx, cx, cy, r + 1, Palette.outline);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > r * r) continue;
      let c = base;
      if (dx + dy <= -Math.ceil(r * 0.7)) c = light;
      else if (dx + dy >= Math.ceil(r * 0.8)) c = dark;
      px(ctx, cx + dx, cy + dy, 1, 1, c);
    }
  }
}

/**
 * Triângulo com ápice no TOPO (telhados, copas de pinheiro) com sombreamento.
 * (O helper roof() antigo desenhava o triângulo invertido — telhados viravam
 * "asas" largas no topo, visível no screenshot assets/status/drops_atual.png.)
 */
function peak(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  stripes = false,
): void {
  const light = shade(base, 1.18);
  const dark = shade(base, 0.72);
  for (let row = 0; row < h; row++) {
    const half = Math.max(1, Math.round(((row + 1) / h) * (w / 2)));
    const rx = Math.round(x + w / 2 - half);
    const rw = half * 2;
    let c = base;
    if (row < 2) c = light;
    else if (stripes && row % 3 === 2) c = dark;
    if (row === h - 1) c = dark;
    px(ctx, rx, y + row, rw, 1, c);
    dot(ctx, rx, y + row, Palette.outline);
    dot(ctx, rx + rw - 1, y + row, Palette.outline);
  }
}

/** Poste de madeira com veios e contorno. */
function post(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  box(ctx, x, y, w, h, Palette.wood);
  px(ctx, x + 1, y + 1, 1, h - 2, shade(Palette.wood, 1.2));
  if (w > 3) px(ctx, x + w - 2, y + 2, 1, h - 4, Palette.woodDark);
}

/** Tufo de lâminas de grama. */
function tuft(ctx: CanvasRenderingContext2D, x: number, groundY: number, blades = 3): void {
  for (let i = 0; i < blades; i++) {
    const bx = x + i * 3;
    const h = 5 + ((i * 7) % 4);
    px(ctx, bx, groundY - h, 2, h, i % 2 ? Palette.leafDark : Palette.leaf);
    dot(ctx, bx, groundY - h, Palette.grassLight);
  }
}

/** Caule com par de folhas. */
function stemLeaf(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number): void {
  px(ctx, x, top, 2, bottom - top, Palette.leafDark);
  px(ctx, x - 4, top + 6, 4, 2, Palette.leaf);
  px(ctx, x + 2, top + 10, 4, 2, Palette.leafDark);
}

/** Cabeça de flor: 6 pétalas ao redor de um miolo. */
function flowerHead(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  petal: string,
  center: string,
  size = 2,
): void {
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2 - Math.PI / 2;
    const fx = cx + Math.round(Math.cos(ang) * (size + 2));
    const fy = cy + Math.round(Math.sin(ang) * (size + 2));
    orb(ctx, fx, fy, size, petal);
  }
  orb(ctx, cx, cy, size, center);
}

/** Tronco de árvore com contorno, veios e raízes alargadas na base. */
function trunk(ctx: CanvasRenderingContext2D, cx: number, groundY: number, w: number, h: number): void {
  const x = cx - Math.floor(w / 2);
  box(ctx, x, groundY - h, w, h, Palette.wood);
  px(ctx, x + 1, groundY - h + 2, 1, h - 4, shade(Palette.wood, 1.2));
  px(ctx, x + w - 2, groundY - h + 2, 1, h - 4, Palette.woodDark);
  px(ctx, x + Math.floor(w / 2), groundY - h + 3, 1, h - 6, Palette.woodDark);
  // raízes
  px(ctx, x - 2, groundY - 2, 3, 2, Palette.woodDark);
  px(ctx, x + w - 1, groundY - 2, 3, 2, Palette.woodDark);
}

// ---------------------------------------------------------------------------
// Vegetação
// ---------------------------------------------------------------------------

function drawFlower(ctx: CanvasRenderingContext2D, ox: number, oy: number, petal: string, center: string = Palette.flowerYellow): void {
  tuft(ctx, ox + 16, oy + G, 2);
  tuft(ctx, ox + 42, oy + G, 2);
  // flor principal
  stemLeaf(ctx, ox + 29, oy + 32, oy + G);
  flowerHead(ctx, ox + 30, oy + 27, petal, center, 3);
  dot(ctx, ox + 29, oy + 25, shade(petal, 1.35));
  // flor secundária menor
  px(ctx, ox + 43, oy + 44, 2, G - 44, Palette.leaf);
  flowerHead(ctx, ox + 44, oy + 41, petal, center, 2);
}

function drawBush(ctx: CanvasRenderingContext2D, ox: number, oy: number, large: boolean): void {
  const cy = oy + (large ? 42 : 46);
  const r = large ? 12 : 9;
  orb(ctx, ox + 22, cy + 4, r - 2, Palette.leafDark, shade(Palette.leafDark, 1.25));
  orb(ctx, ox + 42, cy + 4, r - 3, Palette.leaf);
  orb(ctx, ox + 32, cy - 3, r, Palette.leaf, Palette.grassLight);
  // brilhos de folha
  for (const [fx, fy] of [[26, cy - 6], [36, cy - 9], [30, cy - 2]] as const) {
    dot(ctx, ox + fx, fy, Palette.grassLight);
  }
  if (large) {
    // frutinhas
    for (const [bx, by] of [[24, cy], [38, cy - 4], [32, cy + 4]] as const) {
      orb(ctx, ox + bx, by, 1, Palette.flowerRed);
    }
  }
  px(ctx, ox + 29, oy + G - 2, 6, 2, Palette.woodDark);
  tuft(ctx, ox + 12, oy + G, 2);
}

function drawRock(ctx: CanvasRenderingContext2D, ox: number, oy: number, large: boolean): void {
  const w = large ? 30 : 20;
  const h = large ? 18 : 12;
  const x = ox + 32 - Math.floor(w / 2);
  const y = oy + G - h;
  // silhueta irregular (base larga, topo estreito deslocado)
  px(ctx, x - 1, y + 3, w + 2, h - 3, Palette.outline);
  px(ctx, x + 2, y - 1, w - 6, 5, Palette.outline);
  px(ctx, x, y + 4, w, h - 4, Palette.stone);
  px(ctx, x + 3, y, w - 8, 5, Palette.stone);
  // luz topo-esquerda e sombra base
  px(ctx, x + 4, y + 1, Math.floor(w / 3), 3, shade(Palette.stone, 1.2));
  px(ctx, x + 1, y + h - 3, w - 2, 3, Palette.stoneDark);
  // rachaduras
  for (let i = 0; i < (large ? 5 : 3); i++) {
    dot(ctx, x + 5 + i * 4, y + 5 + (i % 3) * 2, Palette.stoneDark);
  }
  if (large) {
    // musgo
    px(ctx, x + 3, y + 3, 6, 3, Palette.leafDark);
    dot(ctx, x + 5, y + 2, Palette.leaf);
  }
  orb(ctx, ox + (large ? 52 : 46), oy + G - 2, 2, Palette.stone);
  tuft(ctx, ox + 8, oy + G, 2);
}

function drawTree(ctx: CanvasRenderingContext2D, ox: number, oy: number, kind: string): void {
  if (kind === 'pine') {
    trunk(ctx, ox + 32, oy + G, 7, 14);
    peak(ctx, ox + 12, oy + 32, 40, 15, Palette.leafDark);
    peak(ctx, ox + 16, oy + 21, 32, 13, Palette.leaf);
    peak(ctx, ox + 20, oy + 9, 24, 14, Palette.leafDark);
    dot(ctx, ox + 32, oy + 7, Palette.outline);
    // brilhos nas bordas dos tiers
    for (const [tx, ty] of [[24, 33], [40, 34], [28, 23], [36, 24]] as const) {
      dot(ctx, ox + tx, ty + oy, Palette.grassLight);
    }
  } else if (kind === 'palm') {
    // tronco curvado com anéis
    for (let i = 0; i < 8; i++) {
      const sx = ox + 28 + Math.round(i * 0.9);
      const sy = oy + G - 5 - i * 5;
      px(ctx, sx - 1, sy, 7, 6, Palette.outline);
      px(ctx, sx, sy + 1, 5, 5, i % 2 ? Palette.wood : shade(Palette.wood, 0.88));
      px(ctx, sx + 1, sy + 1, 1, 4, shade(Palette.wood, 1.18));
    }
    const cx = ox + 37;
    const cy = oy + 16;
    // frondes arqueadas para os dois lados
    for (const [dir, droop, len] of [[-1, 0.5, 5], [1, 0.5, 5], [-1, 1.1, 4], [1, 1.1, 4], [-1, 0.15, 4], [1, 0.15, 4]] as const) {
      for (let s = 0; s < len; s++) {
        const fx = cx + dir * (2 + s * 3);
        const fy = cy - 3 + Math.round(s * s * droop * 0.45);
        px(ctx, fx - 1, fy - 1, 5, 4, Palette.outline);
        px(ctx, fx, fy, 3, 2, s < 2 ? Palette.leaf : Palette.leafDark);
        dot(ctx, fx, fy, Palette.grassLight);
      }
    }
    // cocos
    orb(ctx, cx - 3, cy + 3, 2, Palette.woodDark);
    orb(ctx, cx + 3, cy + 4, 2, Palette.woodDark);
  } else if (kind === 'cherry') {
    trunk(ctx, ox + 32, oy + G, 8, 18);
    orb(ctx, ox + 20, oy + 30, 9, Palette.flowerPink, '#ffd0dc');
    orb(ctx, ox + 44, oy + 30, 9, Palette.flowerPink, '#ffd0dc');
    orb(ctx, ox + 32, oy + 20, 13, Palette.flowerPink, '#ffd0dc');
    // flores brancas
    for (const [bx, by] of [[24, 24], [36, 16], [42, 26], [28, 32], [38, 32], [32, 24]] as const) {
      px(ctx, ox + bx, oy + by, 2, 2, Palette.flowerWhite);
      dot(ctx, ox + bx, oy + by, '#ffe8f0');
    }
    // pétalas caindo
    dot(ctx, ox + 14, oy + 44, Palette.flowerPink);
    dot(ctx, ox + 50, oy + 40, Palette.flowerPink);
    dot(ctx, ox + 46, oy + 50, '#ffd0dc');
  } else {
    // oak / apple: copa frondosa em 4 orbes
    trunk(ctx, ox + 32, oy + G, 8, 20);
    orb(ctx, ox + 18, oy + 32, 9, Palette.leafDark, shade(Palette.leafDark, 1.3));
    orb(ctx, ox + 46, oy + 32, 9, Palette.leafDark, shade(Palette.leafDark, 1.3));
    orb(ctx, ox + 32, oy + 26, 15, Palette.leaf, Palette.grassLight);
    orb(ctx, ox + 32, oy + 13, 8, Palette.leaf, Palette.grassLight);
    for (const [lx, ly] of [[24, 20], [40, 18], [30, 30], [44, 26]] as const) {
      dot(ctx, ox + lx, oy + ly, Palette.grassLight);
    }
    if (kind === 'apple') {
      for (const [ax, ay] of [[22, 26], [36, 18], [44, 30], [28, 34], [38, 30]] as const) {
        orb(ctx, ox + ax, oy + ay, 2, Palette.roofRed);
        dot(ctx, ox + ax - 1, oy + ay - 1, '#ff9a9a');
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Construções
// ---------------------------------------------------------------------------

function drawHouse(ctx: CanvasRenderingContext2D, ox: number, oy: number, roofColor: string, wide = 2): void {
  const w = wide === 3 ? 56 : 48;
  const x = ox + Math.floor((64 - w) / 2);
  const wallH = 22;
  const wallY = oy + 34;

  // fundação de pedra
  px(ctx, x - 1, wallY + wallH, w + 2, 3, Palette.stone);
  px(ctx, x - 1, wallY + wallH + 2, w + 2, 2, Palette.stoneDark);
  // parede
  box(ctx, x, wallY, w, wallH, Palette.wall);
  px(ctx, x + 1, wallY + 1, w - 2, 2, shade(Palette.wall, 1.05));
  px(ctx, x + 1, wallY + wallH - 3, w - 2, 2, Palette.wallDark);
  // vigas de madeira
  for (const bx of [x + 3, x + w - 5]) px(ctx, bx, wallY + 1, 2, wallH - 2, Palette.woodDark);

  // porta em arco
  const doorW = 12;
  const doorH = 16;
  const doorX = x + Math.floor(w / 2) - Math.floor(doorW / 2);
  const doorY = wallY + wallH - doorH;
  px(ctx, doorX - 1, doorY, doorW + 2, doorH, Palette.outline);
  px(ctx, doorX, doorY - 1, doorW, doorH + 1, Palette.outline);
  px(ctx, doorX + 1, doorY, doorW - 2, doorH, Palette.woodDark);
  px(ctx, doorX + 2, doorY + 1, doorW - 4, 1, Palette.wood);
  for (let i = 1; i < 3; i++) px(ctx, doorX + 1 + i * 3, doorY + 2, 1, doorH - 2, shade(Palette.woodDark, 0.75));
  dot(ctx, doorX + doorW - 4, doorY + Math.floor(doorH / 2), Palette.flowerYellow);
  px(ctx, doorX - 1, wallY + wallH, doorW + 2, 2, Palette.stoneDark);

  // janelas com venezianas e floreiras
  for (const wx of [x + 6, x + w - 16]) {
    const wy = wallY + 5;
    box(ctx, wx, wy, 10, 9, Palette.waterMid);
    px(ctx, wx + 1, wy + 1, 3, 2, '#bfe8ff');
    px(ctx, wx + 4, wy, 2, 9, Palette.wall);
    px(ctx, wx, wy + 4, 10, 2, Palette.wall);
    px(ctx, wx - 2, wy, 2, 9, Palette.woodDark);
    px(ctx, wx + 10, wy, 2, 9, Palette.woodDark);
    px(ctx, wx - 1, wy + 9, 12, 3, Palette.wood);
    dot(ctx, wx + 1, wy + 8, Palette.flowerRed);
    dot(ctx, wx + 4, wy + 8, Palette.flowerYellow);
    dot(ctx, wx + 7, wy + 8, Palette.flowerPink);
  }

  // telhado com fileiras de telhas + chaminé
  peak(ctx, x - 4, oy + 16, w + 8, 19, roofColor, true);
  const chX = x + w - 16;
  box(ctx, chX, oy + 8, 7, 12, Palette.stone);
  px(ctx, chX + 1, oy + 8, 5, 2, Palette.stoneDark);
  dot(ctx, chX + 2, oy + 4, Palette.wallDark);
  dot(ctx, chX + 4, oy + 2, shade(Palette.wallDark, 1.1));
}

function drawBarn(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const w = 58;
  const x = ox + 3;
  const wallH = 24;
  const wallY = oy + 32;
  const red = Palette.roofRed;

  px(ctx, x - 1, wallY + wallH, w + 2, 3, Palette.stoneDark);
  box(ctx, x, wallY, w, wallH, red);
  px(ctx, x + 1, wallY + 1, w - 2, 2, shade(red, 1.15));
  px(ctx, x + 1, wallY + wallH - 3, w - 2, 2, shade(red, 0.7));
  // cantos com guarnição branca
  for (const bx of [x + 1, x + w - 3]) px(ctx, bx, wallY + 1, 2, wallH - 2, Palette.wall);

  // portão grande com travas em X
  const dW = 20;
  const dH = 18;
  const dX = x + Math.floor(w / 2) - Math.floor(dW / 2);
  const dY = wallY + wallH - dH;
  box(ctx, dX, dY, dW, dH, Palette.woodDark);
  px(ctx, dX + Math.floor(dW / 2), dY + 1, 1, dH - 2, Palette.outline);
  for (let i = 0; i < dW - 2; i++) {
    dot(ctx, dX + 1 + i, dY + 1 + Math.round((i * (dH - 3)) / (dW - 3)), Palette.wood);
    dot(ctx, dX + 1 + i, dY + dH - 2 - Math.round((i * (dH - 3)) / (dW - 3)), Palette.wood);
  }
  // feno vazando na porta
  px(ctx, dX + 2, dY + dH - 3, 5, 3, Palette.roofYellow);
  dot(ctx, dX + 4, dY + dH - 4, shade(Palette.roofYellow, 1.25));

  // telhado cinza + janela do sótão
  peak(ctx, x - 2, oy + 12, w + 4, 21, Palette.stoneDark, true);
  box(ctx, ox + 28, oy + 20, 8, 7, Palette.wall);
  px(ctx, ox + 30, oy + 22, 4, 3, Palette.woodDark);
}

function drawShop(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  drawHouse(ctx, ox, oy, Palette.roofBlue, 3);
  const x = ox + 4;
  const w = 56;
  // toldo listrado com barra inferior
  const awnY = oy + 33;
  for (let i = 0; i < 8; i++) {
    px(ctx, x + 2 + i * 7, awnY, 7, 5, i % 2 === 0 ? Palette.roofRed : Palette.flowerWhite);
  }
  px(ctx, x + 2, awnY, w - 4, 1, Palette.outline);
  for (let i = 0; i < 7; i++) dot(ctx, x + 5 + i * 7, awnY + 5, Palette.outline);
  // placa SHOP
  const signW = 30;
  const signX = ox + 32 - signW / 2;
  box(ctx, signX, oy + 20, signW, 10, Palette.wood);
  px(ctx, signX + 1, oy + 21, signW - 2, 1, shade(Palette.wood, 1.2));
  ctx.fillStyle = Palette.flowerWhite;
  ctx.font = 'bold 8px monospace';
  ctx.fillText('SHOP', signX + 5, oy + 28);
}

// ---------------------------------------------------------------------------
// Decor de chão (conchas, cogumelos, etc.)
// ---------------------------------------------------------------------------

function drawShell(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const cx = ox + 32;
  const cy = oy + G - 4;
  // leque (metade superior de um círculo)
  for (let dy = -9; dy <= 0; dy++) {
    for (let dx = -9; dx <= 9; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > 81) continue;
      const edge = d2 > 62;
      px(ctx, cx + dx, cy + dy, 1, 1, edge ? Palette.outline : Palette.sandLight);
    }
  }
  // sulcos radiais
  for (const ang of [-1.1, -0.55, 0, 0.55, 1.1]) {
    for (let r = 3; r < 8; r++) {
      dot(ctx, cx + Math.round(Math.sin(ang) * r), cy - Math.round(Math.cos(ang) * r), Palette.sandDark);
    }
  }
  px(ctx, cx - 2, cy, 4, 3, Palette.flowerPink);
  px(ctx, cx - 3, cy + 2, 6, 1, Palette.outline);
  dot(ctx, cx - 4, cy - 6, Palette.flowerWhite);
  dot(ctx, ox + 46, oy + G - 2, Palette.sandDark);
  dot(ctx, ox + 18, oy + G - 1, Palette.sandDark);
}

function drawStarfish(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const cx = ox + 32;
  const cy = oy + G - 9;
  // braços: contorno primeiro, depois preenchimento
  for (const pass of [0, 1]) {
    for (let a = 0; a < 5; a++) {
      const ang = (a / 5) * Math.PI * 2 - Math.PI / 2;
      for (let r = 0; r <= 8; r += 2) {
        const bx = cx + Math.round(Math.cos(ang) * r);
        const by = cy + Math.round(Math.sin(ang) * r);
        const size = r < 4 ? 3 : r < 7 ? 2 : 1;
        if (pass === 0) blobFill(ctx, bx, by, size + 1, Palette.outline);
        else blobFill(ctx, bx, by, size, Palette.coralOrange);
      }
    }
  }
  orb(ctx, cx, cy, 3, Palette.coral);
  // pintinhas
  for (let a = 0; a < 5; a++) {
    const ang = (a / 5) * Math.PI * 2 - Math.PI / 2;
    dot(ctx, cx + Math.round(Math.cos(ang) * 5), cy + Math.round(Math.sin(ang) * 5), '#ffc890');
  }
  dot(ctx, ox + 14, oy + G - 2, Palette.sandDark);
  dot(ctx, ox + 50, oy + G - 3, Palette.sandDark);
}

function drawGrassTuft(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  for (let i = 0; i < 7; i++) {
    const bx = ox + 18 + i * 4;
    const h = 7 + ((i * 5) % 6);
    const lean = i < 3 ? -1 : i > 4 ? 1 : 0;
    px(ctx, bx, oy + G - h, 2, h - 2, i % 2 ? Palette.leafDark : Palette.leaf);
    px(ctx, bx + lean, oy + G - h - 2, 2, 3, i % 2 ? Palette.leaf : Palette.grassLight);
  }
  dot(ctx, ox + 30, oy + G - 12, Palette.flowerYellow);
}

function drawMushroom(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // cogumelo grande
  const st = shade(Palette.flowerWhite, 0.92);
  box(ctx, ox + 27, oy + 42, 9, G - 42, st);
  px(ctx, ox + 28, oy + 44, 2, 10, Palette.flowerWhite);
  // chapéu (meia-esfera)
  for (let dy = -9; dy <= 2; dy++) {
    for (let dx = -11; dx <= 11; dx++) {
      if ((dx * dx) / 121 + (dy * dy) / 81 > 1) continue;
      const edge = (dx * dx) / 100 + (dy * dy) / 64 > 1;
      let c: string = edge ? Palette.outline : Palette.roofRed;
      if (!edge && dx + dy < -6) c = '#e06a6a';
      px(ctx, ox + 31 + dx, oy + 40 + dy, 1, 1, c);
    }
  }
  px(ctx, ox + 22, oy + 42, 19, 1, shade(Palette.roofRed, 0.6));
  // pintas brancas
  for (const [mx, my] of [[25, 36], [34, 33], [38, 38]] as const) {
    px(ctx, ox + mx, oy + my, 3, 2, Palette.flowerWhite);
  }
  // cogumelo pequeno
  box(ctx, ox + 45, oy + 52, 4, 6, st);
  orb(ctx, ox + 46, oy + 50, 4, Palette.coralOrange);
  dot(ctx, ox + 45, oy + 48, Palette.flowerWhite);
  tuft(ctx, ox + 14, oy + G, 2);
}

function drawClover(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const clumps: ReadonlyArray<readonly [number, number, boolean]> = [
    [22, 48, false], [36, 44, true], [44, 52, false], [28, 54, false],
  ];
  for (const [cx, cy, lucky] of clumps) {
    px(ctx, ox + cx, oy + cy + 3, 1, 4, Palette.leafDark);
    const leaves: ReadonlyArray<readonly [number, number]> = lucky
      ? [[-3, 0], [0, -3], [3, 0], [0, 3]]
      : [[-3, 0], [0, -3], [3, 0]];
    for (const [dx, dy] of leaves) {
      orb(ctx, ox + cx + dx, oy + cy + dy, 2, Palette.leaf, Palette.grassLight);
    }
    if (lucky) dot(ctx, ox + cx, oy + cy, Palette.flowerWhite);
  }
}

function drawFern(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  px(ctx, ox + 31, oy + 30, 2, G - 30, Palette.leafDark);
  for (let i = 0; i < 5; i++) {
    const y = oy + 34 + i * 5;
    const len = 11 - i * 2;
    px(ctx, ox + 31 - len, y, len, 2, Palette.leaf);
    px(ctx, ox + 33, y + 2, len, 2, Palette.leafDark);
    // folíolos
    for (let s = 2; s < len; s += 3) {
      dot(ctx, ox + 31 - s, y - 1, Palette.grassLight);
      dot(ctx, ox + 33 + s, y + 1, Palette.leaf);
    }
  }
  // topo enrolado
  orb(ctx, ox + 33, oy + 28, 2, Palette.grassLight);
  tuft(ctx, ox + 14, oy + G, 2);
}

function drawPebble(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  orb(ctx, ox + 26, oy + G - 4, 5, Palette.stone);
  orb(ctx, ox + 38, oy + G - 3, 4, Palette.sandDark);
  orb(ctx, ox + 33, oy + G - 9, 3, shade(Palette.stone, 1.12));
  dot(ctx, ox + 24, oy + G - 6, shade(Palette.stone, 1.3));
  dot(ctx, ox + 46, oy + G - 2, Palette.stoneDark);
}

function drawDriftwood(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const y = oy + G - 10;
  box(ctx, ox + 12, y, 38, 9, Palette.wood);
  // veios ondulados
  for (let i = 0; i < 34; i += 2) {
    dot(ctx, ox + 14 + i, y + 3 + (Math.floor(i / 6) % 2), Palette.woodDark);
    if (i % 6 === 0) dot(ctx, ox + 14 + i, y + 6, shade(Palette.wood, 0.8));
  }
  // toco de galho
  box(ctx, ox + 38, y - 6, 6, 7, Palette.wood);
  px(ctx, ox + 39, y - 5, 2, 4, shade(Palette.wood, 1.15));
  // anéis na ponta
  px(ctx, ox + 13, y + 2, 2, 5, shade(Palette.wood, 1.2));
  dot(ctx, ox + 14, y + 4, Palette.woodDark);
  // areia ao redor
  dot(ctx, ox + 8, oy + G - 1, Palette.sandLight);
  dot(ctx, ox + 54, oy + G - 2, Palette.sandLight);
}

function drawCoral(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // base rochosa
  px(ctx, ox + 20, oy + G - 3, 24, 3, Palette.stoneDark);
  // três ramos arredondados
  box(ctx, ox + 22, oy + 38, 6, G - 41, Palette.coral);
  orb(ctx, ox + 24, oy + 37, 3, Palette.coral);
  box(ctx, ox + 31, oy + 30, 6, G - 33, Palette.coralOrange);
  orb(ctx, ox + 33, oy + 29, 3, Palette.coralOrange);
  box(ctx, ox + 40, oy + 42, 5, G - 45, Palette.coral);
  orb(ctx, ox + 42, oy + 41, 2, Palette.coral);
  // ramificação lateral
  px(ctx, ox + 36, oy + 36, 4, 3, Palette.coralOrange);
  orb(ctx, ox + 41, oy + 36, 2, Palette.coralOrange);
  // bolhas
  dot(ctx, ox + 27, oy + 30, Palette.flowerWhite);
  dot(ctx, ox + 38, oy + 24, Palette.flowerWhite);
}

function drawLily(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const cx = ox + 30;
  const cy = oy + G - 6;
  // folha (elipse) com recorte
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -12; dx <= 12; dx++) {
      const d = (dx * dx) / 144 + (dy * dy) / 25;
      if (d > 1) continue;
      // recorte em V no lado direito
      if (dx > 4 && Math.abs(dy) < (dx - 4) * 0.8) continue;
      const edge = d > 0.72;
      px(ctx, cx + dx, cy + dy, 1, 1, edge ? Palette.leafDark : Palette.leaf);
    }
  }
  px(ctx, cx - 8, cy - 2, 6, 1, Palette.grassLight);
  // flor sobre a folha
  flowerHead(ctx, cx + 2, cy - 6, Palette.flowerWhite, Palette.flowerYellow, 2);
}

function drawTulip(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // tulipa vermelha grande
  px(ctx, ox + 27, oy + 36, 2, G - 36, Palette.leafDark);
  px(ctx, ox + 21, oy + 44, 6, 2, Palette.leaf);
  px(ctx, ox + 29, oy + 48, 6, 2, Palette.leafDark);
  box(ctx, ox + 24, oy + 28, 9, 9, Palette.flowerRed);
  px(ctx, ox + 26, oy + 30, 3, 4, '#ff8080');
  dot(ctx, ox + 26, oy + 27, Palette.flowerRed);
  dot(ctx, ox + 30, oy + 27, Palette.flowerRed);
  // tulipa rosa menor
  px(ctx, ox + 41, oy + 42, 2, G - 42, Palette.leaf);
  box(ctx, ox + 39, oy + 36, 7, 7, Palette.flowerPink);
  px(ctx, ox + 41, oy + 38, 2, 3, '#ffb0c0');
  tuft(ctx, ox + 14, oy + G, 2);
}

function drawDaisy(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  stemLeaf(ctx, ox + 27, oy + 34, oy + G);
  flowerHead(ctx, ox + 28, oy + 29, Palette.flowerWhite, Palette.flowerYellow, 3);
  px(ctx, ox + 42, oy + 46, 2, G - 46, Palette.leafDark);
  flowerHead(ctx, ox + 43, oy + 43, Palette.flowerWhite, Palette.flowerYellow, 2);
  tuft(ctx, ox + 14, oy + G, 2);
}

// ---------------------------------------------------------------------------
// Utilitários / mobiliário
// ---------------------------------------------------------------------------

function drawCrate(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const x = ox + 17;
  const y = oy + 34;
  const w = 30;
  const h = G - 34;
  box(ctx, x, y, w, h, Palette.wood);
  px(ctx, x + 1, y + 1, w - 2, 2, shade(Palette.wood, 1.18));
  // moldura interna
  px(ctx, x + 3, y + 4, w - 6, 2, Palette.woodDark);
  px(ctx, x + 3, y + h - 5, w - 6, 2, Palette.woodDark);
  px(ctx, x + 3, y + 4, 2, h - 8, Palette.woodDark);
  px(ctx, x + w - 5, y + 4, 2, h - 8, Palette.woodDark);
  // travessa diagonal
  for (let i = 0; i < w - 10; i++) {
    dot(ctx, x + 5 + i, y + 5 + Math.round((i * (h - 11)) / (w - 11)), shade(Palette.wood, 0.82));
  }
  // pregos
  for (const [nx, ny] of [[x + 2, y + 2], [x + w - 3, y + 2], [x + 2, y + h - 3], [x + w - 3, y + h - 3]] as const) {
    dot(ctx, nx, ny, Palette.stoneDark);
  }
}

function drawBarrel(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const y = oy + 32;
  const h = G - 32;
  box(ctx, ox + 21, y, 22, h, Palette.wood);
  // bojo lateral
  px(ctx, ox + 19, y + 5, 2, h - 10, Palette.wood);
  px(ctx, ox + 43, y + 5, 2, h - 10, Palette.wood);
  dot(ctx, ox + 19, y + 5, Palette.outline);
  dot(ctx, ox + 19, y + h - 6, Palette.outline);
  dot(ctx, ox + 44, y + 5, Palette.outline);
  dot(ctx, ox + 44, y + h - 6, Palette.outline);
  // aduelas
  for (const sx of [27, 32, 37]) px(ctx, ox + sx, y + 1, 1, h - 2, Palette.woodDark);
  px(ctx, ox + 23, y + 2, 2, h - 4, shade(Palette.wood, 1.18));
  // aros de metal
  for (const ry of [y + 4, y + h - 6]) {
    px(ctx, ox + 19, ry, 26, 3, Palette.stoneDark);
    px(ctx, ox + 21, ry + 1, 5, 1, shade(Palette.stone, 1.1));
  }
  // tampa
  px(ctx, ox + 22, y - 2, 20, 3, Palette.woodDark);
  px(ctx, ox + 24, y - 1, 16, 1, shade(Palette.wood, 1.1));
}

function drawBucket(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // balde cônico
  for (let r = 0; r < 14; r++) {
    const wRow = 20 - Math.round((r * 6) / 14);
    const x = ox + 32 - Math.floor(wRow / 2);
    px(ctx, x - 1, oy + 44 + r, wRow + 2, 1, Palette.outline);
    px(ctx, x, oy + 44 + r, wRow, 1, Palette.wood);
    px(ctx, x + 2, oy + 44 + r, 2, 1, shade(Palette.wood, 1.2));
    px(ctx, x + wRow - 4, oy + 44 + r, 2, 1, Palette.woodDark);
  }
  // borda + água
  px(ctx, ox + 21, oy + 42, 22, 3, Palette.woodDark);
  px(ctx, ox + 24, oy + 43, 16, 1, Palette.waterShallow);
  dot(ctx, ox + 27, oy + 43, Palette.flowerWhite);
  // alça
  for (let t = 0; t <= 10; t++) {
    const hx = ox + 22 + t * 2;
    const hy = oy + 42 - Math.round(Math.sin((t / 10) * Math.PI) * 7);
    dot(ctx, hx, hy, Palette.stoneDark);
  }
}

function drawShovel(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // pá fincada no chão
  px(ctx, ox + 30, oy + 22, 3, 26, Palette.wood);
  px(ctx, ox + 31, oy + 23, 1, 24, shade(Palette.wood, 1.2));
  // empunhadura em D
  box(ctx, ox + 26, oy + 14, 11, 9, Palette.wood);
  ctx.clearRect(ox + 29, oy + 17, 5, 3);
  // lâmina
  for (let r = 0; r < 12; r++) {
    const wRow = r < 8 ? 12 : 12 - (r - 7) * 3;
    px(ctx, ox + 32 - Math.floor(wRow / 2) - 1, oy + 47 + r, wRow + 2, 1, Palette.outline);
    px(ctx, ox + 32 - Math.floor(wRow / 2), oy + 47 + r, wRow, 1, Palette.stone);
    dot(ctx, ox + 29, oy + 47 + r, shade(Palette.stone, 1.25));
  }
  // monte de terra
  blobFill(ctx, ox + 43, oy + G - 1, 4, Palette.path);
  dot(ctx, ox + 41, oy + G - 4, shade(Palette.path, 1.3));
}

function drawForkTool(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // forcado em pé, dentes para cima
  px(ctx, ox + 31, oy + 24, 3, G - 24, Palette.wood);
  px(ctx, ox + 32, oy + 25, 1, G - 26, shade(Palette.wood, 1.2));
  px(ctx, ox + 24, oy + 21, 17, 3, Palette.stoneDark);
  for (const tx of [24, 31, 38]) {
    px(ctx, ox + tx, oy + 10, 2, 11, Palette.stone);
    dot(ctx, ox + tx, oy + 10, shade(Palette.stone, 1.3));
  }
  // feno na base
  for (const [hx, hy] of [[24, G - 3], [40, G - 2], [28, G - 5]] as const) {
    px(ctx, ox + hx, oy + hy, 4, 2, Palette.roofYellow);
  }
  dot(ctx, ox + 27, oy + G - 6, shade(Palette.roofYellow, 1.25));
}

function drawSignPost(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  post(ctx, ox + 30, oy + 22, 5, G - 22);
  // placa maior apontando à direita
  box(ctx, ox + 14, oy + 26, 28, 11, Palette.wood);
  for (let i = 0; i < 5; i++) px(ctx, ox + 42 + i, oy + 27 + i, 1, 9 - i * 2, Palette.wood);
  for (let i = 0; i < 5; i++) dot(ctx, ox + 42 + i, oy + 26 + i, Palette.outline);
  for (let i = 0; i < 5; i++) dot(ctx, ox + 42 + i, oy + 36 - i, Palette.outline);
  px(ctx, ox + 15, oy + 27, 26, 1, shade(Palette.wood, 1.2));
  px(ctx, ox + 18, oy + 30, 16, 2, Palette.woodDark);
  px(ctx, ox + 18, oy + 33, 10, 2, Palette.woodDark);
  // placa menor apontando à esquerda
  box(ctx, ox + 22, oy + 12, 22, 9, Palette.wood);
  for (let i = 0; i < 4; i++) dot(ctx, ox + 21 - i, oy + 13 + i, Palette.outline);
  for (let i = 0; i < 4; i++) dot(ctx, ox + 21 - i, oy + 19 - i, Palette.outline);
  px(ctx, ox + 26, oy + 15, 12, 2, Palette.woodDark);
  dot(ctx, ox + 32, oy + 24, Palette.stoneDark);
}

function drawLantern(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // poste com braço
  post(ctx, ox + 24, oy + 24, 4, G - 24);
  px(ctx, ox + 24, oy + 22, 14, 3, Palette.woodDark);
  dot(ctx, ox + 37, oy + 25, Palette.stoneDark);
  // lanterna pendurada
  const lx = ox + 33;
  const ly = oy + 27;
  px(ctx, lx + 3, ly - 1, 2, 2, Palette.stoneDark);
  box(ctx, lx, ly + 1, 10, 13, Palette.stoneDark);
  px(ctx, lx + 2, ly + 3, 6, 9, '#fff3b0');
  px(ctx, lx + 3, ly + 5, 4, 5, Palette.flowerYellow);
  dot(ctx, lx + 4, ly + 7, Palette.coralOrange);
  // brilho
  dot(ctx, lx - 2, ly + 6, Palette.flowerYellow);
  dot(ctx, lx + 12, ly + 8, Palette.flowerYellow);
  px(ctx, lx + 2, ly + 14, 6, 2, Palette.stoneDark);
  tuft(ctx, ox + 14, oy + G, 2);
}

function drawFence(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  for (const fx of [10, 29, 48]) {
    post(ctx, ox + fx, oy + 32, 5, G - 32);
    // topo apontado
    px(ctx, ox + fx + 1, oy + 30, 3, 2, Palette.wood);
    dot(ctx, ox + fx + 2, oy + 29, Palette.outline);
  }
  for (const [ry, c] of [[38, Palette.wood], [48, shade(Palette.wood, 0.88)]] as const) {
    px(ctx, ox + 7, oy + ry, 50, 4, c);
    px(ctx, ox + 7, oy + ry, 50, 1, shade(c, 1.2));
    dot(ctx, ox + 7, oy + ry, Palette.outline);
    dot(ctx, ox + 56, oy + ry, Palette.outline);
    px(ctx, ox + 7, oy + ry + 3, 50, 1, Palette.woodDark);
  }
  tuft(ctx, ox + 18, oy + G, 2);
  tuft(ctx, ox + 38, oy + G, 2);
}

function drawFenceCorner(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // poste de canto
  post(ctx, ox + 42, oy + 30, 6, G - 30);
  px(ctx, ox + 43, oy + 28, 4, 2, Palette.wood);
  dot(ctx, ox + 45, oy + 27, Palette.outline);
  // ripas indo para a esquerda
  for (const [ry, c] of [[38, Palette.wood], [48, shade(Palette.wood, 0.88)]] as const) {
    px(ctx, ox + 8, oy + ry, 36, 4, c);
    px(ctx, ox + 8, oy + ry, 36, 1, shade(c, 1.2));
    dot(ctx, ox + 8, oy + ry, Palette.outline);
    px(ctx, ox + 8, oy + ry + 3, 36, 1, Palette.woodDark);
  }
  // ripas indo para cima (norte)
  for (const rx of [40, 48]) {
    px(ctx, ox + rx, oy + 12, 4, 22, rx === 40 ? Palette.wood : shade(Palette.wood, 0.88));
    px(ctx, ox + rx, oy + 12, 1, 22, shade(Palette.wood, 1.15));
    dot(ctx, ox + rx, oy + 12, Palette.outline);
    px(ctx, ox + rx + 3, oy + 12, 1, 22, Palette.woodDark);
  }
  tuft(ctx, ox + 16, oy + G, 2);
}

function drawUmbrella(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  px(ctx, ox + 31, oy + 26, 3, G - 26, Palette.woodDark);
  px(ctx, ox + 32, oy + 27, 1, G - 29, Palette.wood);
  // copa listrada
  const cw = 44;
  const cx0 = ox + 10;
  for (let row = 0; row < 15; row++) {
    const half = Math.max(1, Math.round(((row + 1) / 15) * (cw / 2)));
    const rx = Math.round(cx0 + cw / 2 - half);
    for (let i = 0; i < half * 2; i++) {
      const gx = rx + i;
      const stripe = Math.floor((gx - ox - 4) / 8) % 2 === 0;
      px(ctx, gx, oy + 12 + row, 1, 1, stripe ? Palette.roofRed : Palette.flowerWhite);
    }
    dot(ctx, rx, oy + 12 + row, Palette.outline);
    dot(ctx, rx + half * 2 - 1, oy + 12 + row, Palette.outline);
  }
  // borda recortada
  for (let i = 0; i < 6; i++) dot(ctx, cx0 + 3 + i * 8, oy + 27, Palette.outline);
  dot(ctx, ox + 32, oy + 10, Palette.outline);
  px(ctx, ox + 31, oy + 8, 3, 3, Palette.flowerYellow);
  dot(ctx, ox + 44, oy + G - 2, Palette.sandLight);
}

function drawChair(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // encosto
  post(ctx, ox + 22, oy + 26, 4, 18);
  post(ctx, ox + 38, oy + 26, 4, 18);
  px(ctx, ox + 23, oy + 28, 18, 3, Palette.wood);
  px(ctx, ox + 23, oy + 34, 18, 3, shade(Palette.wood, 0.9));
  dot(ctx, ox + 23, oy + 28, Palette.outline);
  dot(ctx, ox + 40, oy + 28, Palette.outline);
  // assento
  box(ctx, ox + 20, oy + 43, 24, 5, shade(Palette.wood, 1.1));
  px(ctx, ox + 21, oy + 44, 22, 1, shade(Palette.wood, 1.25));
  // pernas
  px(ctx, ox + 22, oy + 48, 3, G - 48, Palette.woodDark);
  px(ctx, ox + 39, oy + 48, 3, G - 48, Palette.woodDark);
  px(ctx, ox + 25, oy + 52, 14, 2, Palette.woodDark);
}

function drawLounger(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // encosto inclinado (listras azuis/brancas)
  for (let i = 0; i < 5; i++) {
    const c = i % 2 === 0 ? Palette.roofBlue : Palette.flowerWhite;
    px(ctx, ox + 8 + i * 2, oy + 30 + i * 3, 14, 3, c);
    dot(ctx, ox + 8 + i * 2, oy + 30 + i * 3, Palette.outline);
  }
  // parte plana
  for (let i = 0; i < 6; i++) {
    const c = i % 2 === 0 ? Palette.flowerWhite : Palette.roofBlue;
    px(ctx, ox + 20 + i * 6, oy + 44, 6, 4, c);
  }
  px(ctx, ox + 20, oy + 43, 36, 1, Palette.outline);
  px(ctx, ox + 20, oy + 48, 36, 1, Palette.outline);
  // estrutura + pés
  px(ctx, ox + 18, oy + 48, 40, 2, Palette.wood);
  px(ctx, ox + 22, oy + 50, 3, G - 50, Palette.woodDark);
  px(ctx, ox + 50, oy + 50, 3, G - 50, Palette.woodDark);
}

function drawRopeCoil(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const cx = ox + 30;
  const cy = oy + G - 8;
  // rolo (elipse achatada) com anéis
  for (let dy = -7; dy <= 7; dy++) {
    for (let dx = -11; dx <= 11; dx++) {
      const d = (dx * dx) / 121 + (dy * dy) / 49;
      if (d > 1) continue;
      let c = shade(Palette.wood, 1.05);
      if (d > 0.75) c = Palette.outline;
      else if (d > 0.45) c = Palette.woodDark;
      else if (d > 0.28) c = shade(Palette.wood, 1.15);
      else if (d > 0.12) c = Palette.woodDark;
      px(ctx, cx + dx, cy + dy, 1, 1, c);
    }
  }
  // ponta solta
  for (let t = 0; t < 8; t++) {
    px(ctx, cx + 10 + t, cy + 2 + Math.round(t * 0.5), 2, 2, Palette.wood);
  }
  dot(ctx, cx + 18, cy + 6, Palette.outline);
}

function drawSack(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const base = shade(Palette.sand, 0.92);
  // corpo bojudo
  for (let dy = -10; dy <= 10; dy++) {
    for (let dx = -12; dx <= 12; dx++) {
      const d = (dx * dx) / 144 + (dy * dy) / 100;
      if (d > 1) continue;
      let c = base;
      if (d > 0.8) c = Palette.outline;
      else if (dx + dy < -8) c = shade(base, 1.15);
      else if (dx + dy > 9) c = Palette.sandDark;
      px(ctx, ox + 30 + dx, oy + 46 + dy, 1, 1, c);
    }
  }
  // gargalo amarrado
  px(ctx, ox + 26, oy + 32, 8, 5, base);
  px(ctx, ox + 25, oy + 34, 10, 2, Palette.woodDark);
  px(ctx, ox + 27, oy + 29, 6, 3, shade(base, 1.1));
  dot(ctx, ox + 26, oy + 29, Palette.outline);
  dot(ctx, ox + 33, oy + 30, Palette.outline);
  // dobras
  px(ctx, ox + 24, oy + 44, 6, 1, Palette.sandDark);
  px(ctx, ox + 32, oy + 50, 7, 1, Palette.sandDark);
  // remendo costurado
  px(ctx, ox + 34, oy + 42, 6, 5, Palette.wood);
  dot(ctx, ox + 34, oy + 42, Palette.woodDark);
  dot(ctx, ox + 39, oy + 46, Palette.woodDark);
  // grãos derramados
  dot(ctx, ox + 46, oy + G - 1, Palette.flowerYellow);
  dot(ctx, ox + 49, oy + G - 2, Palette.roofYellow);
}

function drawWateringCan(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const m = Palette.stone;
  // corpo
  box(ctx, ox + 24, oy + 38, 20, G - 38, m);
  px(ctx, ox + 26, oy + 40, 3, G - 42, shade(m, 1.2));
  px(ctx, ox + 40, oy + 40, 2, G - 42, Palette.stoneDark);
  px(ctx, ox + 25, oy + 39, 18, 1, shade(m, 1.25));
  // bico
  for (let t = 0; t < 8; t++) {
    px(ctx, ox + 23 - t, oy + 44 - Math.round(t * 0.8), 3, 3, t === 7 ? Palette.stoneDark : m);
  }
  // crivo
  box(ctx, ox + 13, oy + 35, 6, 6, Palette.stoneDark);
  dot(ctx, ox + 15, oy + 37, shade(m, 1.2));
  // alça superior em arco
  for (let t = 0; t <= 12; t++) {
    const hx = ox + 26 + t;
    const hy = oy + 37 - Math.round(Math.sin((t / 12) * Math.PI) * 6);
    dot(ctx, hx, hy, Palette.stoneDark);
    dot(ctx, hx, hy - 1, Palette.stoneDark);
  }
  // gotas
  dot(ctx, ox + 10, oy + 44, Palette.waterShallow);
  dot(ctx, ox + 13, oy + 47, Palette.waterShallow);
  tuft(ctx, ox + 48, oy + G, 2);
}

function drawBottle(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const glass = Palette.roofGreen;
  // corpo
  box(ctx, ox + 27, oy + 38, 11, G - 38, glass);
  px(ctx, ox + 28, oy + 36, 9, 3, glass);
  dot(ctx, ox + 27, oy + 37, Palette.outline);
  dot(ctx, ox + 37, oy + 37, Palette.outline);
  // gargalo + rolha
  box(ctx, ox + 30, oy + 29, 5, 8, glass);
  px(ctx, ox + 30, oy + 26, 5, 3, Palette.wood);
  dot(ctx, ox + 30, oy + 25, Palette.outline);
  dot(ctx, ox + 34, oy + 25, Palette.outline);
  // brilho do vidro
  px(ctx, ox + 29, oy + 40, 2, 12, shade(glass, 1.4));
  dot(ctx, ox + 31, oy + 31, shade(glass, 1.4));
  // rótulo
  px(ctx, ox + 28, oy + 46, 9, 5, Palette.flowerWhite);
  px(ctx, ox + 29, oy + 48, 7, 1, Palette.stoneDark);
  dot(ctx, ox + 44, oy + G - 2, Palette.sandDark);
}

function drawMilkPail(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const m = shade(Palette.stone, 1.05);
  // balde de metal cônico
  for (let r = 0; r < 15; r++) {
    const wRow = 22 - Math.round((r * 5) / 15);
    const x = ox + 32 - Math.floor(wRow / 2);
    px(ctx, x - 1, oy + 43 + r, wRow + 2, 1, Palette.outline);
    px(ctx, x, oy + 43 + r, wRow, 1, m);
    px(ctx, x + 2, oy + 43 + r, 2, 1, shade(m, 1.25));
    px(ctx, x + wRow - 3, oy + 43 + r, 2, 1, Palette.stoneDark);
  }
  // leite
  px(ctx, ox + 22, oy + 41, 20, 3, Palette.stoneDark);
  px(ctx, ox + 24, oy + 42, 16, 1, Palette.flowerWhite);
  dot(ctx, ox + 27, oy + 41, Palette.flowerWhite);
  // alça lateral
  for (let t = 0; t <= 10; t++) {
    const hx = ox + 23 + t * 2;
    const hy = oy + 41 - Math.round(Math.sin((t / 10) * Math.PI) * 6);
    dot(ctx, hx, hy, Palette.stoneDark);
  }
  // rebites
  dot(ctx, ox + 24, oy + 48, Palette.stoneDark);
  dot(ctx, ox + 39, oy + 48, Palette.stoneDark);
}

function drawStool(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // assento (elipse) com anéis de veio
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -11; dx <= 11; dx++) {
      const d = (dx * dx) / 121 + (dy * dy) / 16;
      if (d > 1) continue;
      let c = shade(Palette.wood, 1.1);
      if (d > 0.72) c = Palette.outline;
      else if (d > 0.4 && d < 0.55) c = Palette.woodDark;
      px(ctx, ox + 32 + dx, oy + 40 + dy, 1, 1, c);
    }
  }
  px(ctx, ox + 26, oy + 38, 6, 1, shade(Palette.wood, 1.25));
  // pernas abertas
  for (let i = 0; i < 12; i++) {
    px(ctx, ox + 25 - Math.round(i * 0.35), oy + 45 + i, 3, 1, Palette.woodDark);
    px(ctx, ox + 37 + Math.round(i * 0.35), oy + 45 + i, 3, 1, Palette.woodDark);
  }
  px(ctx, ox + 31, oy + 45, 3, 12, shade(Palette.woodDark, 1.15));
}

function drawWheelbarrow(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // caçamba trapezoidal
  for (let r = 0; r < 10; r++) {
    const wRow = 30 - r;
    const x = ox + 26 - Math.floor(wRow / 2);
    px(ctx, x - 1, oy + 32 + r, wRow + 2, 1, Palette.outline);
    px(ctx, x, oy + 32 + r, wRow, 1, r < 2 ? shade(Palette.wood, 1.15) : Palette.wood);
    if (r > 2 && r % 3 === 0) px(ctx, x + 2, oy + 32 + r, wRow - 4, 1, shade(Palette.wood, 0.88));
  }
  // carga de feno
  for (const [hx, hy] of [[18, 30], [24, 28], [30, 30]] as const) {
    orb(ctx, ox + hx, oy + hy, 3, Palette.roofYellow);
  }
  // roda com raios
  orb(ctx, ox + 16, oy + G - 6, 6, Palette.stoneDark, shade(Palette.stoneDark, 1.3));
  dot(ctx, ox + 16, oy + G - 6, Palette.stone);
  px(ctx, ox + 16, oy + G - 10, 1, 9, Palette.stone);
  px(ctx, ox + 12, oy + G - 6, 9, 1, Palette.stone);
  // braços + perna de apoio
  for (let i = 0; i < 14; i++) {
    px(ctx, ox + 40 + i, oy + 38 - Math.round(i * 0.3), 1, 3, Palette.wood);
  }
  dot(ctx, ox + 53, oy + 34, Palette.outline);
  px(ctx, ox + 42, oy + 42, 3, G - 42, Palette.woodDark);
}

function drawHayBale(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const hay = Palette.roofYellow;
  const x = ox + 13;
  const y = oy + 36;
  const w = 38;
  const h = G - 36;
  box(ctx, x, y, w, h, hay);
  px(ctx, x + 1, y + 1, w - 2, 3, shade(hay, 1.2));
  px(ctx, x + 1, y + h - 3, w - 2, 2, shade(hay, 0.75));
  // textura de palha (tracinhos)
  for (let i = 0; i < 14; i++) {
    const tx = x + 3 + (i * 7) % (w - 6);
    const ty = y + 4 + ((i * 5) % (h - 8));
    px(ctx, tx, ty, 3, 1, shade(hay, 0.8));
  }
  // amarras
  px(ctx, x + 10, y, 2, h, Palette.woodDark);
  px(ctx, x + w - 12, y, 2, h, Palette.woodDark);
  // palhas soltas
  dot(ctx, x - 2, y + h - 1, shade(hay, 1.15));
  dot(ctx, x + w + 1, y + h - 2, shade(hay, 1.15));
  dot(ctx, x + 6, y - 2, shade(hay, 1.1));
}

function drawLightString(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  post(ctx, ox + 7, oy + 28, 4, G - 28);
  post(ctx, ox + 53, oy + 28, 4, G - 28);
  // fio em catenária
  for (let t = 0; t <= 20; t++) {
    const wx = ox + 9 + Math.round((t / 20) * 44);
    const wy = oy + 30 + Math.round(Math.sin((t / 20) * Math.PI) * 6);
    dot(ctx, wx, wy, Palette.outline);
  }
  // lâmpadas coloridas com brilho
  const colors = [Palette.flowerYellow, Palette.flowerPink, Palette.waterShallow, Palette.coralOrange, Palette.flowerYellow];
  for (let i = 0; i < 5; i++) {
    const t = (i + 1) / 6;
    const bx = ox + 9 + Math.round(t * 44);
    const by = oy + 31 + Math.round(Math.sin(t * Math.PI) * 6);
    dot(ctx, bx, by + 1, Palette.stoneDark);
    orb(ctx, bx, by + 4, 2, colors[i]);
    dot(ctx, bx - 1, by + 3, shade(colors[i], 1.35));
  }
}

function drawWell(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  // anel de pedra com juntas
  const x = ox + 14;
  const y = oy + 40;
  const w = 36;
  const h = G - 40;
  box(ctx, x, y, w, h, Palette.stone);
  for (let i = 0; i < 6; i++) px(ctx, x + 2 + i * 6, y + 2, 1, h - 4, Palette.stoneDark);
  px(ctx, x + 1, y + Math.floor(h / 2), w - 2, 1, Palette.stoneDark);
  px(ctx, x + 1, y + 1, w - 2, 2, shade(Palette.stone, 1.2));
  // água
  px(ctx, x + 5, y + 4, w - 10, 6, Palette.waterMid);
  px(ctx, x + 8, y + 5, 8, 2, Palette.waterShallow);
  dot(ctx, x + 22, y + 7, Palette.waterShallow);
  // estrutura de madeira
  post(ctx, ox + 15, oy + 16, 4, 26);
  post(ctx, ox + 45, oy + 16, 4, 26);
  // telhadinho
  peak(ctx, ox + 9, oy + 6, 46, 11, Palette.roofRed, true);
  // eixo + manivela + corda + baldinho
  px(ctx, ox + 18, oy + 24, 28, 3, Palette.woodDark);
  px(ctx, ox + 47, oy + 22, 2, 5, Palette.woodDark);
  px(ctx, ox + 49, oy + 22, 3, 2, Palette.wood);
  px(ctx, ox + 31, oy + 27, 2, 10, '#d9c38a');
  box(ctx, ox + 28, oy + 37, 8, 6, Palette.wood);
  px(ctx, ox + 29, oy + 38, 6, 1, shade(Palette.wood, 1.2));
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

const FLOWER_COLORS: Record<string, string> = {
  flower_red: Palette.flowerRed,
  flower_yellow: Palette.flowerYellow,
  flower_white: Palette.flowerWhite,
  flower_pink: Palette.flowerPink,
};

const HOUSE_COLORS: Record<string, string> = {
  house_red: Palette.roofRed,
  house_blue: Palette.roofBlue,
  house_green: Palette.roofGreen,
  house_yellow: Palette.roofYellow,
};

function drawPropSprite(ctx: CanvasRenderingContext2D, cellX: number, cellY: number, id: string): void {
  const ox = cellX;
  const oy = cellY;

  if (id in FLOWER_COLORS) {
    drawFlower(ctx, ox, oy, FLOWER_COLORS[id], id === 'flower_yellow' ? Palette.coralOrange : Palette.flowerYellow);
    return;
  }
  if (id.startsWith('tree_')) {
    drawTree(ctx, ox, oy, id.replace('tree_', ''));
    return;
  }
  if (id in HOUSE_COLORS) {
    drawHouse(ctx, ox, oy, HOUSE_COLORS[id]);
    return;
  }

  switch (id) {
    case 'bush_small': drawBush(ctx, ox, oy, false); break;
    case 'bush_large': drawBush(ctx, ox, oy, true); break;
    case 'rock_small': drawRock(ctx, ox, oy, false); break;
    case 'rock_large': drawRock(ctx, ox, oy, true); break;
    case 'shell': drawShell(ctx, ox, oy); break;
    case 'starfish': drawStarfish(ctx, ox, oy); break;
    case 'grass_tuft': drawGrassTuft(ctx, ox, oy); break;
    case 'mushroom': drawMushroom(ctx, ox, oy); break;
    case 'clover': drawClover(ctx, ox, oy); break;
    case 'fern': drawFern(ctx, ox, oy); break;
    case 'pebble': drawPebble(ctx, ox, oy); break;
    case 'driftwood': drawDriftwood(ctx, ox, oy); break;
    case 'coral_piece': drawCoral(ctx, ox, oy); break;
    case 'lily': drawLily(ctx, ox, oy); break;
    case 'tulip': drawTulip(ctx, ox, oy); break;
    case 'daisy': drawDaisy(ctx, ox, oy); break;
    case 'crate': drawCrate(ctx, ox, oy); break;
    case 'barrel': drawBarrel(ctx, ox, oy); break;
    case 'bucket_item': drawBucket(ctx, ox, oy); break;
    case 'shovel': drawShovel(ctx, ox, oy); break;
    case 'fork_tool': drawForkTool(ctx, ox, oy); break;
    case 'sign_post': drawSignPost(ctx, ox, oy); break;
    case 'lantern': drawLantern(ctx, ox, oy); break;
    case 'fence': drawFence(ctx, ox, oy); break;
    case 'fence_corner': drawFenceCorner(ctx, ox, oy); break;
    case 'umbrella': drawUmbrella(ctx, ox, oy); break;
    case 'chair': drawChair(ctx, ox, oy); break;
    case 'lounger': drawLounger(ctx, ox, oy); break;
    case 'rope_coil': drawRopeCoil(ctx, ox, oy); break;
    case 'sack': drawSack(ctx, ox, oy); break;
    case 'watering_can': drawWateringCan(ctx, ox, oy); break;
    case 'bottle': drawBottle(ctx, ox, oy); break;
    case 'milk_pail': drawMilkPail(ctx, ox, oy); break;
    case 'stool': drawStool(ctx, ox, oy); break;
    case 'wheelbarrow': drawWheelbarrow(ctx, ox, oy); break;
    case 'hay_bale': drawHayBale(ctx, ox, oy); break;
    case 'light_string': drawLightString(ctx, ox, oy); break;
    case 'well': drawWell(ctx, ox, oy); break;
    case 'barn': drawBarn(ctx, ox, oy); break;
    case 'shop': drawShop(ctx, ox, oy); break;
    default:
      // Nunca deveria acontecer: todo id do catálogo tem arte própria acima.
      drawCrate(ctx, ox, oy);
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
        const img = texture.image as HTMLImageElement;
        const count = PROP_CATALOG.length;
        const cols = PROP_ATLAS_COLS;
        const rows = Math.ceil(count / cols);

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || cols * PROP_CELL_PX;
        canvas.height = img.naturalHeight || rows * PROP_CELL_PX;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          texture.dispose();
          resolve(buildPropsAtlas());
          return;
        }
        ctx.drawImage(img, 0, 0);

        // MuAPI coral often includes grass/island noise — keep procedural reef decor.
        const coral = PROP_CATALOG.find((p) => p.id === 'coral_piece');
        if (coral) {
          const cellX = (coral.atlasIndex % cols) * PROP_CELL_PX;
          const cellY = Math.floor(coral.atlasIndex / cols) * PROP_CELL_PX;
          ctx.clearRect(cellX, cellY, PROP_CELL_PX, PROP_CELL_PX);
          drawPropSprite(ctx, cellX, cellY, 'coral_piece');
        }

        texture.dispose();
        const patched = new THREE.CanvasTexture(canvas);
        patched.magFilter = THREE.NearestFilter;
        patched.minFilter = THREE.NearestFilter;
        patched.generateMipmaps = false;
        patched.premultiplyAlpha = false;

        cachedAtlas = { texture: patched, cols, rows, cellPx: PROP_CELL_PX };
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
