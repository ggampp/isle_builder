import type { ColorMask } from './colors.ts';
import { DIR_VECTORS, DIRECTIONS, reflect } from './grid.ts';
import type { Direction, Placements, Puzzle } from './grid.ts';
import { indexOf } from './grid.ts';

/**
 * Resultado da propagação da luz. As máscaras por direção servem tanto para o
 * desenho (cada célula desenha meia-hasta de entrada e meia de saída) quanto
 * para a checagem dos alvos.
 */
export interface Simulation {
  /** Máscara que ENTRA na célula viajando na direção d: `index * 4 + d`. */
  incoming: Uint8Array;
  /** Máscara que SAI da célula viajando na direção d: `index * 4 + d`. */
  outgoing: Uint8Array;
  /** Máscara total presente na célula (mistura de tudo que chega). */
  atCell: Uint8Array;
  /** Alvos acesos com exatamente a cor pedida. */
  lit: Set<number>;
  /** Alvos que recebem luz, mas na cor errada. */
  wrong: Set<number>;
}

interface Pending {
  x: number;
  y: number;
  dir: Direction;
  mask: ColorMask;
}

/**
 * Regras da luz neste jogo:
 * - a luz segue reta em célula vazia e é refletida 90° por um espelho;
 * - paredes, emissores e alvos absorvem o feixe;
 * - **feixes que se cruzam se misturam**: tudo que chega numa célula é somado
 *   (OR aditivo) e sai misturado em todas as direções de saída. É daí que vem
 *   laranja, roxo, verde e branco.
 *
 * As máscaras só crescem durante a propagação, então laços na grade convergem
 * em vez de rodar para sempre — não há limite artificial de passos.
 */
export function simulate(puzzle: Puzzle, placements: Placements): Simulation {
  const size = puzzle.width * puzzle.height;
  const incoming = new Uint8Array(size * 4);
  const outgoing = new Uint8Array(size * 4);
  const atCell = new Uint8Array(size);

  const queue: Pending[] = [];

  puzzle.cells.forEach((cell, index) => {
    if (cell.kind !== 'emitter') return;
    const x = index % puzzle.width;
    const y = Math.floor(index / puzzle.width);
    atCell[index] = cell.color;
    outgoing[index * 4 + cell.dir] = cell.color;
    const v = DIR_VECTORS[cell.dir];
    queue.push({ x: x + v.dx, y: y + v.dy, dir: cell.dir, mask: cell.color });
  });

  while (queue.length > 0) {
    const step = queue.pop() as Pending;
    const { x, y, dir, mask } = step;
    if (x < 0 || y < 0 || x >= puzzle.width || y >= puzzle.height) continue;

    const index = indexOf(puzzle, x, y);
    const cell = puzzle.cells[index];
    if (cell.kind === 'wall' || cell.kind === 'emitter') continue;

    const slot = index * 4 + dir;
    const before = incoming[slot];
    const merged = before | mask;
    if (merged === before) continue;
    incoming[slot] = merged;

    const previousAtCell = atCell[index];
    atCell[index] = previousAtCell | mask;
    if (cell.kind === 'target') continue;

    // A cor da célula pode ter crescido: reemitir TODAS as saídas com a mistura.
    const total = atCell[index];
    const mirror = placements.get(index);
    for (const d of DIRECTIONS) {
      if (incoming[index * 4 + d] === 0) continue;
      const out = mirror ? reflect(d, mirror) : d;
      const outSlot = index * 4 + out;
      const grew = (outgoing[outSlot] | total) !== outgoing[outSlot];
      outgoing[outSlot] |= total;
      if (!grew) continue;
      const v = DIR_VECTORS[out];
      queue.push({ x: x + v.dx, y: y + v.dy, dir: out, mask: total });
    }
  }

  const lit = new Set<number>();
  const wrong = new Set<number>();
  puzzle.cells.forEach((cell, index) => {
    if (cell.kind !== 'target') return;
    const got = atCell[index];
    if (got === cell.want) lit.add(index);
    else if (got !== 0) wrong.add(index);
  });

  return { incoming, outgoing, atCell, lit, wrong };
}

/** Todos os alvos acesos na cor certa? */
export function isSolved(puzzle: Puzzle, sim: Simulation): boolean {
  const targets = puzzle.cells.filter((c) => c.kind === 'target').length;
  return targets > 0 && sim.lit.size === targets;
}
