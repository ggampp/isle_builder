import type { ColorMask } from './colors.ts';

/** Direções de deslocamento; o eixo Y cresce para baixo (coordenada de tela). */
export const UP = 0;
export const RIGHT = 1;
export const DOWN = 2;
export const LEFT = 3;
export type Direction = 0 | 1 | 2 | 3;
export const DIRECTIONS: Direction[] = [UP, RIGHT, DOWN, LEFT];

export const DIR_VECTORS: Record<Direction, { dx: number; dy: number }> = {
  0: { dx: 0, dy: -1 },
  1: { dx: 1, dy: 0 },
  2: { dx: 0, dy: 1 },
  3: { dx: -1, dy: 0 },
};

export const DIR_NAMES: Record<Direction, string> = {
  0: 'cima', 1: 'direita', 2: 'baixo', 3: 'esquerda',
};

export function opposite(dir: Direction): Direction {
  return ((dir + 2) % 4) as Direction;
}

/** As duas orientações de espelho: `/` e `\`. */
export type Mirror = 'slash' | 'backslash';

/** Reflexão de um feixe que viaja em `dir` ao atingir o espelho. */
export function reflect(dir: Direction, mirror: Mirror): Direction {
  if (mirror === 'slash') {
    // "/" — quem vai para a direita sobe; quem desce vai para a esquerda.
    return ({ 0: RIGHT, 1: UP, 2: LEFT, 3: DOWN } as Record<Direction, Direction>)[dir];
  }
  // "\" — quem vai para a direita desce; quem desce vai para a direita.
  return ({ 0: LEFT, 1: DOWN, 2: RIGHT, 3: UP } as Record<Direction, Direction>)[dir];
}

export interface EmitterCell {
  kind: 'emitter';
  color: ColorMask;
  dir: Direction;
}

export interface TargetCell {
  kind: 'target';
  /** Cor exata exigida (pode ser mistura). */
  want: ColorMask;
}

export interface WallCell {
  kind: 'wall';
}

export interface EmptyCell {
  kind: 'empty';
}

export type Cell = EmptyCell | WallCell | EmitterCell | TargetCell;

export interface Puzzle {
  width: number;
  height: number;
  /** Células em ordem de linha (y * width + x). */
  cells: Cell[];
  /** Quantos espelhos o jogador tem para usar. */
  mirrorBudget: number;
  /** Espelhos da solução de referência, por índice de célula. */
  solution: Map<number, Mirror>;
  seed: number;
  difficulty: string;
}

/** Espelhos colocados pelo jogador, por índice de célula. */
export type Placements = Map<number, Mirror>;

export function indexOf(puzzle: { width: number }, x: number, y: number): number {
  return y * puzzle.width + x;
}

export function coordsOf(puzzle: { width: number }, index: number): { x: number; y: number } {
  return { x: index % puzzle.width, y: Math.floor(index / puzzle.width) };
}

export function inBounds(puzzle: { width: number; height: number }, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < puzzle.width && y < puzzle.height;
}

export function cellAt(puzzle: Puzzle, x: number, y: number): Cell | null {
  return inBounds(puzzle, x, y) ? puzzle.cells[indexOf(puzzle, x, y)] : null;
}

export function targetIndices(puzzle: Puzzle): number[] {
  const out: number[] = [];
  puzzle.cells.forEach((cell, i) => {
    if (cell.kind === 'target') out.push(i);
  });
  return out;
}

/** Onde o jogador pode colocar um espelho. */
export function isPlaceable(puzzle: Puzzle, index: number): boolean {
  return puzzle.cells[index]?.kind === 'empty';
}
