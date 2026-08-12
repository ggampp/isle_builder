import { BLUE, RED, YELLOW } from './colors.ts';
import type { ColorMask } from './colors.ts';
import {
  DIRECTIONS, DIR_VECTORS, DOWN, LEFT, RIGHT, UP, indexOf, reflect,
} from './grid.ts';
import type { Cell, Direction, Mirror, Placements, Puzzle } from './grid.ts';
import { simulate } from './simulate.ts';

export interface DifficultySpec {
  id: string;
  label: string;
  size: number;
  emitters: number;
  targets: number;
  /** Quantas curvas cada feixe faz ao ser traçado. */
  turns: [number, number];
  walls: number;
}

export const DIFFICULTIES: DifficultySpec[] = [
  { id: 'facil', label: 'Fácil', size: 6, emitters: 2, targets: 2, turns: [1, 2], walls: 2 },
  { id: 'medio', label: 'Médio', size: 7, emitters: 3, targets: 3, turns: [2, 3], walls: 3 },
  // Cada feixe rende uma ponta boa para alvo, então o difícil ganha um quarto
  // emissor junto com o quarto alvo (a cor dele repete uma primária).
  { id: 'dificil', label: 'Difícil', size: 8, emitters: 4, targets: 4, turns: [3, 5], walls: 5 },
];

export function difficultyById(id: string): DifficultySpec {
  return DIFFICULTIES.find((d) => d.id === id) ?? DIFFICULTIES[1];
}

/** RNG determinístico (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function popcount(mask: number): number {
  return (mask & 1) + ((mask >> 1) & 1) + ((mask >> 2) & 1);
}

/** Qual espelho transforma a direção `from` na direção `to`. */
function mirrorFor(from: Direction, to: Direction): Mirror | null {
  if (reflect(from, 'slash') === to) return 'slash';
  if (reflect(from, 'backslash') === to) return 'backslash';
  return null;
}

interface Draft {
  size: number;
  cells: Cell[];
  mirrors: Map<number, Mirror>;
}

function emptyDraft(size: number): Draft {
  return {
    size,
    cells: Array.from({ length: size * size }, (): Cell => ({ kind: 'empty' })),
    mirrors: new Map(),
  };
}

function asPuzzle(draft: Draft, seed: number, difficulty: string, budget: number): Puzzle {
  return {
    width: draft.size,
    height: draft.size,
    cells: draft.cells,
    mirrorBudget: budget,
    solution: new Map(draft.mirrors),
    seed,
    difficulty,
  };
}

/** Posições de borda com a direção que aponta para dentro do tabuleiro. */
function borderSlots(size: number): { x: number; y: number; dir: Direction }[] {
  const slots: { x: number; y: number; dir: Direction }[] = [];
  for (let i = 1; i < size - 1; i++) {
    slots.push({ x: i, y: 0, dir: DOWN });
    slots.push({ x: i, y: size - 1, dir: UP });
    slots.push({ x: 0, y: i, dir: RIGHT });
    slots.push({ x: size - 1, y: i, dir: LEFT });
  }
  return slots;
}

/**
 * Gera um puzzle **construindo a solução primeiro**: traça o caminho de cada
 * feixe com espelhos, escolhe alvos entre as células que a luz alcança (com
 * preferência por cores misturadas), poda os espelhos que não fazem falta e só
 * então esconde a solução. Assim todo puzzle entregue é resolvível.
 */
export function generatePuzzle(seed: number, spec: DifficultySpec): Puzzle {
  for (let attempt = 0; attempt < 60; attempt++) {
    const puzzle = tryGenerate(seed + attempt * 7919, spec);
    if (puzzle) return puzzle;
  }
  // Nunca deve acontecer com as dificuldades embutidas; se acontecer, cai no fácil.
  const fallback = tryGenerate(seed, DIFFICULTIES[0]);
  if (fallback) return fallback;
  throw new Error('não foi possível gerar um puzzle');
}

function tryGenerate(seed: number, spec: DifficultySpec): Puzzle | null {
  const rng = makeRng(seed);
  const draft = emptyDraft(spec.size);
  const colors: ColorMask[] = [RED, YELLOW, BLUE];
  const slots = borderSlots(spec.size);

  // 1) Emissores em bordas distintas, cada um com sua cor primária.
  const usedSlots: number[] = [];
  for (let i = 0; i < spec.emitters; i++) {
    let slot = null as { x: number; y: number; dir: Direction } | null;
    for (let tries = 0; tries < 40 && !slot; tries++) {
      const candidate = pick(rng, slots);
      const index = indexOf({ width: spec.size }, candidate.x, candidate.y);
      if (usedSlots.includes(index)) continue;
      // Evita dois emissores encostados, que embaralham o começo do traçado.
      const tooClose = usedSlots.some((other) => {
        const ox = other % spec.size;
        const oy = Math.floor(other / spec.size);
        return Math.abs(ox - candidate.x) + Math.abs(oy - candidate.y) < 3;
      });
      if (tooClose) continue;
      slot = candidate;
      usedSlots.push(index);
    }
    if (!slot) return null;
    draft.cells[indexOf({ width: spec.size }, slot.x, slot.y)] = {
      kind: 'emitter',
      color: colors[i % colors.length],
      dir: slot.dir,
    };
  }

  // 2) Traça cada feixe com curvas, deixando espelhos pelo caminho.
  draft.cells.forEach((cell, index) => {
    if (cell.kind !== 'emitter') return;
    traceBeam(draft, rng, index, cell.dir, spec);
  });

  // 3) Alvos: células iluminadas, priorizando misturas e distância do emissor.
  const sim = simulate(asPuzzle(draft, seed, spec.id, 0), draft.mirrors);
  const candidates: { index: number; mask: number; score: number }[] = [];
  draft.cells.forEach((cell, index) => {
    if (cell.kind !== 'empty' || draft.mirrors.has(index)) return;
    const mask = sim.atCell[index];
    if (mask === 0) return;
    const x = index % spec.size;
    const y = Math.floor(index / spec.size);
    const edge = Math.min(x, y, spec.size - 1 - x, spec.size - 1 - y);
    // Pontas de feixe (a luz sairia do tabuleiro ali) são os melhores alvos:
    // absorvê-las não corta o caminho de nenhum outro alvo.
    const terminal = DIRECTIONS.some((d) => {
      if (sim.outgoing[index * 4 + d] === 0) return false;
      const v = DIR_VECTORS[d];
      const nx = x + v.dx;
      const ny = y + v.dy;
      return nx < 0 || ny < 0 || nx >= spec.size || ny >= spec.size;
    });
    // Secundárias (duas primárias) rendem os alvos mais interessantes; branco
    // (as três) aparece demais nos cruzamentos, então vale pouco.
    const flavour = popcount(mask) === 2 ? 34 : popcount(mask) === 1 ? 16 : 4;
    const score = (terminal ? 22 : 0) + flavour + edge + rng();
    candidates.push({ index, mask, score });
  });
  candidates.sort((a, b) => b.score - a.score);

  const chosen: number[] = [];
  const usedColors = new Set<number>();
  // Duas passadas: a primeira exige cores distintas entre os alvos, a segunda
  // completa o que faltar aceitando repetição.
  for (const distinctOnly of [true, false]) {
    for (const candidate of candidates) {
      if (chosen.length >= spec.targets) break;
      if (chosen.includes(candidate.index)) continue;
      if (distinctOnly && usedColors.has(candidate.mask)) continue;

      // Não empilha alvos vizinhos: fica visualmente confuso.
      const x = candidate.index % spec.size;
      const y = Math.floor(candidate.index / spec.size);
      const crowded = chosen.some((other) => {
        const ox = other % spec.size;
        const oy = Math.floor(other / spec.size);
        return Math.abs(ox - x) + Math.abs(oy - y) < 2;
      });
      if (crowded) continue;

      const previous = draft.cells[candidate.index];
      draft.cells[candidate.index] = { kind: 'target', want: candidate.mask };
      const check = simulate(asPuzzle(draft, seed, spec.id, 0), draft.mirrors);
      const stillFine = check.lit.size === chosen.length + 1;
      if (stillFine) {
        chosen.push(candidate.index);
        usedColors.add(candidate.mask);
      } else {
        draft.cells[candidate.index] = previous;
      }
    }
  }
  if (chosen.length < spec.targets) return null;

  const wants = chosen.map((index) => {
    const cell = draft.cells[index];
    return cell.kind === 'target' ? cell.want : 0;
  });
  // Sem nenhuma mistura o puzzle perde a graça...
  if (!wants.some((want) => popcount(want) > 1)) return null;
  // ...e a partir de três alvos, todos da mesma cor também cansa: exige variedade.
  // No fácil só há dois feixes, então repetir a cor ali é aceitável.
  if (spec.targets >= 3 && new Set(wants).size < 2) return null;

  // 4) Poda espelhos que não fazem diferença no resultado.
  for (const index of [...draft.mirrors.keys()]) {
    const saved = draft.mirrors.get(index) as Mirror;
    draft.mirrors.delete(index);
    const check = simulate(asPuzzle(draft, seed, spec.id, 0), draft.mirrors);
    if (check.lit.size !== chosen.length) draft.mirrors.set(index, saved);
  }
  if (draft.mirrors.size === 0) return null;

  // 5) Paredes só onde a luz da solução nunca passa — não podem estragá-la.
  const finalSim = simulate(asPuzzle(draft, seed, spec.id, 0), draft.mirrors);
  const dark: number[] = [];
  draft.cells.forEach((cell, index) => {
    if (cell.kind === 'empty' && !draft.mirrors.has(index) && finalSim.atCell[index] === 0) {
      dark.push(index);
    }
  });
  for (let i = 0; i < spec.walls && dark.length > 0; i++) {
    const at = Math.floor(rng() * dark.length);
    draft.cells[dark[at]] = { kind: 'wall' };
    dark.splice(at, 1);
  }

  const puzzle = asPuzzle(draft, seed, spec.id, draft.mirrors.size);
  // 6) Conferência final: a solução de referência precisa acender tudo.
  const verify = simulate(puzzle, puzzle.solution);
  if (verify.lit.size !== spec.targets) return null;
  return puzzle;
}

/** Caminha pelo tabuleiro a partir do emissor, colocando espelhos nas curvas. */
function traceBeam(
  draft: Draft, rng: () => number, emitterIndex: number, dir: Direction, spec: DifficultySpec,
): void {
  const size = draft.size;
  let x = emitterIndex % size;
  let y = Math.floor(emitterIndex / size);
  let heading = dir;
  const turns = spec.turns[0] + Math.floor(rng() * (spec.turns[1] - spec.turns[0] + 1));

  for (let turn = 0; turn < turns; turn++) {
    const run = 1 + Math.floor(rng() * 3);
    for (let step = 0; step < run; step++) {
      const v = DIR_VECTORS[heading];
      const nx = x + v.dx;
      const ny = y + v.dy;
      if (nx <= 0 || ny <= 0 || nx >= size - 1 || ny >= size - 1) break;
      x = nx;
      y = ny;
    }
    const index = indexOf({ width: size }, x, y);
    if (draft.cells[index].kind !== 'empty' || draft.mirrors.has(index)) return;

    // Escolhe uma curva que ainda tenha espaço à frente.
    const options = DIRECTIONS.filter((d) => {
      if (d === heading || d === ((heading + 2) % 4)) return false;
      const v = DIR_VECTORS[d];
      return x + v.dx > 0 && y + v.dy > 0 && x + v.dx < size - 1 && y + v.dy < size - 1;
    });
    if (options.length === 0) return;
    const next = pick(rng, options);
    const mirror = mirrorFor(heading, next);
    if (!mirror) return;
    draft.mirrors.set(index, mirror);
    heading = next;
  }
}

/** Solução de referência como colocações do jogador (para o botão de dica). */
export function referencePlacements(puzzle: Puzzle): Placements {
  return new Map(puzzle.solution);
}
