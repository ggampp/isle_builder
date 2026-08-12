/**
 * Cores da luz como máscara de bits sobre três primárias. A mistura é aditiva
 * por OR, então dois feixes que se cruzam produzem uma terceira cor.
 * Lógica pura: nada de DOM aqui.
 */

export const RED = 1;
export const YELLOW = 2;
export const BLUE = 4;

/** Máscara de cor: combinação de RED | YELLOW | BLUE (1 a 7). */
export type ColorMask = number;

export const PRIMARIES: ColorMask[] = [RED, YELLOW, BLUE];
export const ALL_COLORS: ColorMask[] = [1, 2, 3, 4, 5, 6, 7];

interface ColorInfo {
  name: string;
  hex: string;
  /** Versão suave, para o brilho ao redor do feixe. */
  glow: string;
}

const INFO: Record<number, ColorInfo> = {
  1: { name: 'vermelho', hex: '#e8544a', glow: 'rgba(232, 84, 74, 0.3)' },
  2: { name: 'amarelo', hex: '#efc133', glow: 'rgba(239, 193, 51, 0.3)' },
  3: { name: 'laranja', hex: '#f0872c', glow: 'rgba(240, 135, 44, 0.3)' },
  4: { name: 'azul', hex: '#3d8ee8', glow: 'rgba(61, 142, 232, 0.3)' },
  5: { name: 'roxo', hex: '#a95ce0', glow: 'rgba(169, 92, 224, 0.3)' },
  6: { name: 'verde', hex: '#49b862', glow: 'rgba(73, 184, 98, 0.3)' },
  7: { name: 'branco', hex: '#eef1f6', glow: 'rgba(238, 241, 246, 0.28)' },
};

export function mix(a: ColorMask, b: ColorMask): ColorMask {
  return (a | b) & 7;
}

export function mixAll(masks: Iterable<ColorMask>): ColorMask {
  let out = 0;
  for (const m of masks) out |= m;
  return out & 7;
}

export function colorName(mask: ColorMask): string {
  return INFO[mask & 7]?.name ?? 'apagado';
}

export function colorHex(mask: ColorMask): string {
  return INFO[mask & 7]?.hex ?? '#4a4f5a';
}

export function colorGlow(mask: ColorMask): string {
  return INFO[mask & 7]?.glow ?? 'rgba(0, 0, 0, 0)';
}

/** Quais primárias compõem a máscara — usado nas dicas dos alvos. */
export function componentsOf(mask: ColorMask): ColorMask[] {
  return PRIMARIES.filter((p) => (mask & p) !== 0);
}

/** Descrição textual da receita da cor ("vermelho + azul"). */
export function recipeOf(mask: ColorMask): string {
  const parts = componentsOf(mask).map(colorName);
  return parts.length <= 1 ? (parts[0] ?? 'apagado') : parts.join(' + ');
}
