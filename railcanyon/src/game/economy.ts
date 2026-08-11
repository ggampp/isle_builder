/** Economia do jogo: moedas, pontos, XP e nível. Lógica pura e testável. */

/** XP acumulado necessário para atingir cada nível (índice = nível - 1). */
export const LEVEL_THRESHOLDS = [0, 900, 1475, 2200, 3100, 4200, 5600, 7300, 9400];

export interface EconomySnapshot {
  coins: number;
  score: number;
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export class Economy {
  coins: number;
  score = 0;
  xp = 0;
  /** Chamado quando o jogador sobe de nível. */
  onLevelUp: ((level: number) => void) | null = null;

  constructor(startingCoins: number) {
    this.coins = startingCoins;
  }

  get level(): number {
    return levelForXp(this.xp);
  }

  snapshot(): EconomySnapshot {
    const level = this.level;
    const base = LEVEL_THRESHOLDS[level - 1] ?? 0;
    const next = LEVEL_THRESHOLDS[level] ?? base + 2000;
    return {
      coins: Math.floor(this.coins),
      score: Math.floor(this.score),
      xp: Math.floor(this.xp),
      level,
      xpIntoLevel: Math.floor(this.xp - base),
      xpForNextLevel: Math.floor(next - base),
    };
  }

  canAfford(cost: number): boolean {
    return this.coins >= cost;
  }

  /** Debita `cost`; devolve false (sem alterar nada) se não houver moedas. */
  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.coins -= cost;
    return true;
  }

  earn(coins: number, score = 0, xp = 0): void {
    const before = this.level;
    this.coins += coins;
    this.score += score;
    this.xp += xp;
    const after = this.level;
    if (after > before && this.onLevelUp) this.onLevelUp(after);
  }

  restore(coins: number, score: number, xp: number): void {
    this.coins = coins;
    this.score = score;
    this.xp = xp;
  }
}
