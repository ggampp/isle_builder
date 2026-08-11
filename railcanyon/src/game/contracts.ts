import { TOWNS, townById } from '../world/towns.ts';

export interface Contract {
  id: string;
  townId: string;
  townName: string;
  resource: string;
  resourceIcon: string;
  amount: number;
  delivered: number;
  reward: number;
  xp: number;
  score: number;
  /** Segundos restantes; só corre depois de aceito. */
  timeLeft: number;
  accepted: boolean;
}

export const MAX_ACCEPTED = 3;
const OFFER_SLOTS = 3;

function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Quadro de contratos: gera ofertas para as cidades conectadas, conta o tempo
 * dos aceitos e registra entregas. Puro (sem DOM/Three) — testável.
 */
export class ContractBoard {
  offers: Contract[] = [];
  accepted: Contract[] = [];
  private rng: () => number;
  private nextId = 1;

  constructor(seed = 1337) {
    this.rng = makeRng(seed);
  }

  /** Repõe as ofertas para as cidades atualmente conectadas. */
  refreshOffers(connectedTownIds: string[], level: number): void {
    const pool = TOWNS.filter((t) => connectedTownIds.includes(t.id));
    this.offers = this.offers.filter((o) => connectedTownIds.includes(o.townId));
    while (this.offers.length < OFFER_SLOTS && pool.length > 0) {
      const town = pool[Math.floor(this.rng() * pool.length)];
      const amount = 18 + Math.floor(this.rng() * 5) * 12 + level * 6;
      const reward = Math.round(amount * (26 + this.rng() * 12) + level * 120);
      this.offers.push({
        id: `c${this.nextId++}`,
        townId: town.id,
        townName: town.name,
        resource: town.resource,
        resourceIcon: town.resourceIcon,
        amount,
        delivered: 0,
        reward,
        xp: Math.round(reward * 0.24),
        score: Math.round(reward * 0.18),
        timeLeft: 260 + Math.round(amount * 2.4),
        accepted: false,
      });
    }
  }

  accept(id: string): Contract | null {
    if (this.accepted.length >= MAX_ACCEPTED) return null;
    const index = this.offers.findIndex((o) => o.id === id);
    if (index < 0) return null;
    const contract = this.offers.splice(index, 1)[0];
    contract.accepted = true;
    this.accepted.push(contract);
    return contract;
  }

  /** Avança os timers; devolve os contratos que expiraram (já removidos). */
  tick(dt: number): Contract[] {
    const expired: Contract[] = [];
    for (const contract of this.accepted) {
      contract.timeLeft -= dt;
      if (contract.timeLeft <= 0) expired.push(contract);
    }
    if (expired.length > 0) {
      this.accepted = this.accepted.filter((c) => !expired.includes(c));
    }
    return expired;
  }

  /**
   * Registra a chegada de carga numa cidade. Devolve quanto foi consumido e
   * os contratos concluídos (removidos da lista de aceitos).
   */
  deliver(townId: string, cargo: number): { used: number; completed: Contract[] } {
    let remaining = cargo;
    const completed: Contract[] = [];
    for (const contract of this.accepted) {
      if (remaining <= 0) break;
      if (contract.townId !== townId) continue;
      const need = contract.amount - contract.delivered;
      const used = Math.min(need, remaining);
      contract.delivered += used;
      remaining -= used;
      if (contract.delivered >= contract.amount) completed.push(contract);
    }
    if (completed.length > 0) {
      this.accepted = this.accepted.filter((c) => !completed.includes(c));
    }
    return { used: cargo - remaining, completed };
  }

  describe(contract: Contract): string {
    const town = townById(contract.townId);
    return `Entregar ${contract.amount} de ${contract.resource} em ${town?.name ?? contract.townName}`;
  }
}
