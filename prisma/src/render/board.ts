import { colorGlow, colorHex } from '../puzzle/colors.ts';
import { DIRECTIONS, DIR_VECTORS } from '../puzzle/grid.ts';
import type { Direction, Placements, Puzzle } from '../puzzle/grid.ts';
import type { Simulation } from '../puzzle/simulate.ts';

const BOARD_BG = '#232833';
const CELL_BG = '#2e3441';
const CELL_EDGE = '#39404f';
const WALL_FILL = '#8d94a3';

export interface BoardLayout {
  /** Lado da célula em pixels de CSS. */
  cell: number;
  /** Canto superior esquerdo da grade dentro do canvas. */
  originX: number;
  originY: number;
}

/**
 * Desenha o tabuleiro num canvas 2D. Cada célula pinta a meia-hasta de entrada
 * com a cor de quem chega e a de saída com a mistura, então a troca de cor
 * acontece exatamente no centro da célula onde os feixes se encontram.
 */
export class BoardRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layout: BoardLayout = { cell: 48, originX: 0, originY: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d indisponível');
    this.ctx = ctx;
  }

  get cellSize(): number {
    return this.layout.cell;
  }

  /** Converte um ponto do mouse (coordenadas de CSS) em célula da grade. */
  cellFromPoint(px: number, py: number, puzzle: Puzzle): number | null {
    const { cell, originX, originY } = this.layout;
    const x = Math.floor((px - originX) / cell);
    const y = Math.floor((py - originY) / cell);
    if (x < 0 || y < 0 || x >= puzzle.width || y >= puzzle.height) return null;
    return y * puzzle.width + x;
  }

  resize(puzzle: Puzzle): void {
    const parent = this.canvas.parentElement;
    // Cabe na altura da janela também: o tabuleiro é quadrado.
    const available = Math.min(parent?.clientWidth ?? 480, 520, window.innerHeight - 300);
    const padding = 14;
    const cell = Math.floor((available - padding * 2) / puzzle.width);
    const size = cell * puzzle.width + padding * 2;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round((cell * puzzle.height + padding * 2) * dpr);
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${cell * puzzle.height + padding * 2}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout = { cell, originX: padding, originY: padding };
  }

  draw(
    puzzle: Puzzle,
    placements: Placements,
    sim: Simulation,
    hover: number | null,
    time: number,
  ): void {
    const ctx = this.ctx;
    const { cell, originX, originY } = this.layout;
    const width = cell * puzzle.width + originX * 2;
    const height = cell * puzzle.height + originY * 2;

    ctx.clearRect(0, 0, width, height);
    roundRect(ctx, 0, 0, width, height, 18);
    ctx.fillStyle = BOARD_BG;
    ctx.fill();

    for (let y = 0; y < puzzle.height; y++) {
      for (let x = 0; x < puzzle.width; x++) {
        const index = y * puzzle.width + x;
        this.drawCellBase(puzzle, index, x, y, hover === index);
      }
    }

    this.drawBeams(puzzle, sim);

    for (let y = 0; y < puzzle.height; y++) {
      for (let x = 0; x < puzzle.width; x++) {
        const index = y * puzzle.width + x;
        this.drawCellContent(puzzle, placements, sim, index, x, y, time);
      }
    }
  }

  private cellRect(x: number, y: number): { x: number; y: number; s: number } {
    const { cell, originX, originY } = this.layout;
    return { x: originX + x * cell, y: originY + y * cell, s: cell };
  }

  private drawCellBase(puzzle: Puzzle, index: number, x: number, y: number, hovered: boolean): void {
    const ctx = this.ctx;
    const r = this.cellRect(x, y);
    const inset = 3;
    roundRect(ctx, r.x + inset, r.y + inset, r.s - inset * 2, r.s - inset * 2, 8);
    ctx.fillStyle = hovered && puzzle.cells[index].kind === 'empty' ? '#39445a' : CELL_BG;
    ctx.fill();
    ctx.strokeStyle = CELL_EDGE;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawBeams(puzzle: Puzzle, sim: Simulation): void {
    const ctx = this.ctx;
    const { cell } = this.layout;
    const thickness = Math.max(2.5, Math.round(cell * 0.075));

    // Ponta reta: as meias-hastes se emendam sem "contas" no centro da célula.
    ctx.lineCap = 'butt';
    // Duas passadas: brilho largo por baixo, feixe nítido por cima.
    for (const pass of ['glow', 'core'] as const) {
      ctx.lineWidth = pass === 'glow' ? thickness * 2.4 : thickness;
      for (let y = 0; y < puzzle.height; y++) {
        for (let x = 0; x < puzzle.width; x++) {
          const index = y * puzzle.width + x;
          const r = this.cellRect(x, y);
          const cx = r.x + r.s / 2;
          const cy = r.y + r.s / 2;
          for (const dir of DIRECTIONS) {
            const inMask = sim.incoming[index * 4 + dir];
            if (inMask !== 0) {
              const v = DIR_VECTORS[dir];
              // Entra pela borda oposta ao sentido de viagem.
              this.segment(cx - v.dx * r.s / 2, cy - v.dy * r.s / 2, cx, cy, inMask, pass);
            }
            const outMask = sim.outgoing[index * 4 + dir];
            if (outMask !== 0) {
              const v = DIR_VECTORS[dir];
              this.segment(cx, cy, cx + v.dx * r.s / 2, cy + v.dy * r.s / 2, outMask, pass);
            }
          }
        }
      }
    }
  }

  private segment(
    x1: number, y1: number, x2: number, y2: number,
    mask: number, pass: 'glow' | 'core',
  ): void {
    const ctx = this.ctx;
    ctx.strokeStyle = pass === 'glow' ? colorGlow(mask) : colorHex(mask);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  private drawCellContent(
    puzzle: Puzzle, placements: Placements, sim: Simulation,
    index: number, x: number, y: number, time: number,
  ): void {
    const ctx = this.ctx;
    const cell = puzzle.cells[index];
    const r = this.cellRect(x, y);
    const cx = r.x + r.s / 2;
    const cy = r.y + r.s / 2;
    const inset = 3;

    if (cell.kind === 'wall') {
      roundRect(ctx, r.x + inset, r.y + inset, r.s - inset * 2, r.s - inset * 2, 8);
      ctx.fillStyle = WALL_FILL;
      ctx.fill();
      return;
    }

    if (cell.kind === 'emitter') {
      const hex = colorHex(cell.color);
      roundRect(ctx, r.x + inset, r.y + inset, r.s - inset * 2, r.s - inset * 2, 8);
      ctx.fillStyle = 'rgba(20, 24, 32, 0.85)';
      ctx.fill();
      ctx.strokeStyle = hex;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      this.drawArrow(cx, cy, cell.dir, r.s * 0.26);
      return;
    }

    if (cell.kind === 'target') {
      const got = sim.atCell[index];
      const solved = got === cell.want;
      const hex = colorHex(cell.want);
      ctx.save();
      ctx.setLineDash(solved ? [] : [5, 4]);
      ctx.strokeStyle = hex;
      ctx.lineWidth = solved ? 3 : 2;
      roundRect(ctx, r.x + inset, r.y + inset, r.s - inset * 2, r.s - inset * 2, 8);
      if (solved) {
        ctx.fillStyle = withAlpha(hex, 0.22);
        ctx.fill();
      }
      ctx.stroke();
      ctx.restore();

      // Anel central: vazio quando apagado, pulsando quando aceso.
      const pulse = solved ? 1 + Math.sin(time * 4) * 0.08 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r.s * 0.16 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = solved ? hex : '#1b2028';
      ctx.fill();
      ctx.strokeStyle = solved ? '#ffffff' : hex;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (!solved && got !== 0) {
        // Recebeu luz na cor errada: ponto interno mostra o que chegou.
        ctx.beginPath();
        ctx.arc(cx, cy, r.s * 0.07, 0, Math.PI * 2);
        ctx.fillStyle = colorHex(got);
        ctx.fill();
      }
      return;
    }

    const mirror = placements.get(index);
    if (mirror) {
      const len = r.s * 0.3;
      const dx = mirror === 'slash' ? len : -len;
      ctx.save();
      ctx.strokeStyle = '#e8f4ff';
      ctx.lineWidth = Math.max(3, r.s * 0.075);
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(150, 210, 255, 0.9)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy + len);
      ctx.lineTo(cx + dx, cy - len);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawArrow(cx: number, cy: number, dir: Direction, size: number): void {
    const ctx = this.ctx;
    const v = DIR_VECTORS[dir];
    const px = -v.dy;
    const py = v.dx;
    ctx.beginPath();
    ctx.moveTo(cx + v.dx * size, cy + v.dy * size);
    ctx.lineTo(cx - v.dx * size * 0.6 + px * size * 0.7, cy - v.dy * size * 0.6 + py * size * 0.7);
    ctx.lineTo(cx - v.dx * size * 0.6 - px * size * 0.7, cy - v.dy * size * 0.6 - py * size * 0.7);
    ctx.closePath();
    ctx.fillStyle = '#f2f4f8';
    ctx.fill();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
