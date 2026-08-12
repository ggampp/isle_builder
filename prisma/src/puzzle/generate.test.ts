import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, generatePuzzle, makeRng } from './generate.ts';
import { dailyPuzzle, randomPuzzle, seedFor, todayKey } from './daily.ts';
import { isSolved, simulate } from './simulate.ts';
import type { Puzzle } from './grid.ts';

function targetsOf(puzzle: Puzzle): number {
  return puzzle.cells.filter((c) => c.kind === 'target').length;
}

describe('gerador', () => {
  it('todo puzzle gerado é resolvível pela própria solução de referência', () => {
    for (const spec of DIFFICULTIES) {
      for (let seed = 1; seed <= 25; seed++) {
        const puzzle = generatePuzzle(seed * 104729, spec);
        const sim = simulate(puzzle, puzzle.solution);
        expect(isSolved(puzzle, sim), `${spec.id}/${seed}`).toBe(true);
        expect(targetsOf(puzzle)).toBe(spec.targets);
      }
    }
  });

  it('o tabuleiro começa vazio: nenhum espelho vem posto', () => {
    const puzzle = generatePuzzle(4242, DIFFICULTIES[1]);
    const sim = simulate(puzzle, new Map());
    expect(sim.lit.size).toBeLessThan(targetsOf(puzzle));
    expect(puzzle.solution.size).toBeGreaterThan(0);
  });

  it('o orçamento de espelhos é o da solução de referência', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const puzzle = generatePuzzle(seed * 7717, DIFFICULTIES[2]);
      expect(puzzle.mirrorBudget).toBe(puzzle.solution.size);
      expect(puzzle.mirrorBudget).toBeGreaterThan(0);
    }
  });

  it('todo espelho da referência é necessário (a poda removeu os inúteis)', () => {
    const puzzle = generatePuzzle(999983, DIFFICULTIES[1]);
    for (const index of puzzle.solution.keys()) {
      const reduced = new Map(puzzle.solution);
      reduced.delete(index);
      expect(isSolved(puzzle, simulate(puzzle, reduced))).toBe(false);
    }
  });

  it('sempre há pelo menos um alvo de cor misturada', () => {
    for (const spec of DIFFICULTIES) {
      const puzzle = generatePuzzle(31337, spec);
      const mixed = puzzle.cells.some((cell) =>
        cell.kind === 'target' && cell.want !== 1 && cell.want !== 2 && cell.want !== 4);
      expect(mixed, spec.id).toBe(true);
    }
  });

  it('paredes nunca ficam no caminho da solução', () => {
    const puzzle = generatePuzzle(56789, DIFFICULTIES[2]);
    const sim = simulate(puzzle, puzzle.solution);
    puzzle.cells.forEach((cell, index) => {
      if (cell.kind === 'wall') expect(sim.atCell[index]).toBe(0);
    });
  });

  it('o RNG é determinístico', () => {
    const a = makeRng(7);
    const b = makeRng(7);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
});

describe('puzzle do dia', () => {
  it('a mesma data e dificuldade dão sempre o mesmo tabuleiro', () => {
    const a = dailyPuzzle('2026-08-12', 'medio');
    const b = dailyPuzzle('2026-08-12', 'medio');
    expect(a.puzzle.seed).toBe(b.puzzle.seed);
    expect(a.puzzle.cells.map((c) => c.kind)).toEqual(b.puzzle.cells.map((c) => c.kind));
    expect([...a.puzzle.solution]).toEqual([...b.puzzle.solution]);
  });

  it('datas diferentes dão sementes diferentes', () => {
    expect(seedFor('2026-08-12', 'medio')).not.toBe(seedFor('2026-08-13', 'medio'));
    expect(seedFor('2026-08-12', 'facil')).not.toBe(seedFor('2026-08-12', 'medio'));
  });

  it('a chave do dia sai no formato AAAA-MM-DD', () => {
    expect(todayKey(new Date(2026, 7, 9))).toBe('2026-08-09');
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('o tabuleiro avulso também é resolvível', () => {
    const extra = randomPuzzle('dificil', 12345);
    expect(extra.isDaily).toBe(false);
    expect(isSolved(extra.puzzle, simulate(extra.puzzle, extra.puzzle.solution))).toBe(true);
  });
});
