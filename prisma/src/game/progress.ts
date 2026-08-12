import type { Mirror } from '../puzzle/grid.ts';

const KEY = 'prisma-progresso-v1';

export interface Progress {
  dateKey: string;
  difficultyId: string;
  /** Espelhos do jogador: pares [índice da célula, orientação]. */
  placements: [number, Mirror][];
  solved: boolean;
}

const EMPTY: Progress = {
  dateKey: '',
  difficultyId: 'medio',
  placements: [],
  solved: false,
};

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Sem armazenamento disponível: o jogo segue, só não guarda o progresso.
  }
}

/** Lê o progresso do dia, descartando qualquer coisa malformada. */
export function loadProgress(): Progress {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { ...EMPTY };
  }
  if (!raw) return { ...EMPTY };

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const placements = Array.isArray(parsed.placements)
      ? (parsed.placements as unknown[]).flatMap((entry): [number, Mirror][] => {
        if (!Array.isArray(entry) || entry.length !== 2) return [];
        const [index, mirror] = entry as [unknown, unknown];
        if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) return [];
        if (mirror !== 'slash' && mirror !== 'backslash') return [];
        return [[index, mirror]];
      })
      : [];
    return {
      dateKey: typeof parsed.dateKey === 'string' ? parsed.dateKey : '',
      difficultyId: typeof parsed.difficultyId === 'string' ? parsed.difficultyId : 'medio',
      placements,
      solved: parsed.solved === true,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // idem
  }
}
