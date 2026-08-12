import { DIFFICULTIES, difficultyById, generatePuzzle } from './generate.ts';
import type { DifficultySpec } from './generate.ts';
import type { Puzzle } from './grid.ts';

/** Data no formato AAAA-MM-DD no fuso local. */
export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Semente estável derivada da data e da dificuldade. */
export function seedFor(dateKey: string, difficultyId: string): number {
  const text = `${dateKey}|${difficultyId}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export interface DailyPuzzle {
  puzzle: Puzzle;
  dateKey: string;
  difficulty: DifficultySpec;
  /** Falso quando o jogador pediu um tabuleiro extra fora do desafio do dia. */
  isDaily: boolean;
}

export function dailyPuzzle(dateKey: string, difficultyId: string): DailyPuzzle {
  const difficulty = difficultyById(difficultyId);
  return {
    puzzle: generatePuzzle(seedFor(dateKey, difficulty.id), difficulty),
    dateKey,
    difficulty,
    isDaily: true,
  };
}

/** Tabuleiro avulso, para quem quiser continuar jogando depois do diário. */
export function randomPuzzle(difficultyId: string, seed = Date.now()): DailyPuzzle {
  const difficulty = difficultyById(difficultyId);
  return {
    puzzle: generatePuzzle(seed >>> 0, difficulty),
    dateKey: todayKey(),
    difficulty,
    isDaily: false,
  };
}

export { DIFFICULTIES };
