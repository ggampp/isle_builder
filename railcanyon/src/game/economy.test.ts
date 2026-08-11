import { describe, expect, it } from 'vitest';
import { Economy, LEVEL_THRESHOLDS, levelForXp } from './economy.ts';
import { ContractBoard, MAX_ACCEPTED } from './contracts.ts';
import { ObjectiveTracker } from './objectives.ts';

describe('economia', () => {
  it('não gasta o que não tem', () => {
    const economy = new Economy(100);
    expect(economy.spend(150)).toBe(false);
    expect(economy.coins).toBe(100);
    expect(economy.spend(60)).toBe(true);
    expect(economy.coins).toBe(40);
  });

  it('o nível acompanha os limiares de XP', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(LEVEL_THRESHOLDS[1] - 1)).toBe(1);
    expect(levelForXp(LEVEL_THRESHOLDS[1])).toBe(2);
    expect(levelForXp(LEVEL_THRESHOLDS[2])).toBe(3);
  });

  it('avisa ao subir de nível', () => {
    const economy = new Economy(0);
    const levels: number[] = [];
    economy.onLevelUp = (level) => levels.push(level);
    economy.earn(0, 0, LEVEL_THRESHOLDS[1]);
    economy.earn(0, 0, 10);
    expect(levels).toEqual([2]);
  });

  it('o resumo mostra o progresso dentro do nível', () => {
    const economy = new Economy(10);
    economy.earn(0, 0, LEVEL_THRESHOLDS[1] + 100);
    const snap = economy.snapshot();
    expect(snap.level).toBe(2);
    expect(snap.xpIntoLevel).toBe(100);
    expect(snap.xpForNextLevel).toBe(LEVEL_THRESHOLDS[2] - LEVEL_THRESHOLDS[1]);
  });
});

describe('contratos', () => {
  it('só oferece contratos de cidades conectadas', () => {
    const board = new ContractBoard(7);
    board.refreshOffers([], 1);
    expect(board.offers).toHaveLength(0);
    board.refreshOffers(['canyon'], 1);
    expect(board.offers.length).toBeGreaterThan(0);
    expect(board.offers.every((o) => o.townId === 'canyon')).toBe(true);
  });

  it('limita os contratos aceitos simultaneamente', () => {
    const board = new ContractBoard(7);
    board.refreshOffers(['canyon', 'pine'], 3);
    let accepted = 0;
    for (let i = 0; i < 6; i++) {
      board.refreshOffers(['canyon', 'pine'], 3);
      const offer = board.offers[0];
      if (offer && board.accept(offer.id)) accepted++;
    }
    expect(accepted).toBe(MAX_ACCEPTED);
    expect(board.accepted).toHaveLength(MAX_ACCEPTED);
  });

  it('entregas abatem a quantidade e concluem o contrato', () => {
    const board = new ContractBoard(11);
    board.refreshOffers(['canyon'], 1);
    const contract = board.accept(board.offers[0].id);
    expect(contract).not.toBeNull();
    if (!contract) return;

    const partial = board.deliver('canyon', 5);
    expect(partial.used).toBe(5);
    expect(partial.completed).toHaveLength(0);
    expect(contract.delivered).toBe(5);

    // Entrega numa cidade errada não conta.
    expect(board.deliver('pine', 100).used).toBe(0);

    const rest = board.deliver('canyon', contract.amount);
    expect(rest.completed).toHaveLength(1);
    expect(rest.used).toBe(contract.amount - 5);
    expect(board.accepted).toHaveLength(0);
  });

  it('contratos aceitos expiram quando o tempo acaba', () => {
    const board = new ContractBoard(3);
    board.refreshOffers(['pine'], 1);
    const contract = board.accept(board.offers[0].id);
    if (!contract) throw new Error('contrato não aceito');
    expect(board.tick(contract.timeLeft - 1)).toHaveLength(0);
    expect(board.tick(2)).toHaveLength(1);
    expect(board.accepted).toHaveLength(0);
  });
});

describe('objetivos', () => {
  it('avançam em ordem conforme o progresso do jogador', () => {
    const tracker = new ObjectiveTracker();
    const progress = {
      piecesPlaced: 0,
      connectedTowns: [] as string[],
      contractsAccepted: 0,
      contractsCompleted: 0,
      buildingsPlaced: 0,
    };
    expect(tracker.check(progress)).toBeNull();
    expect(tracker.fraction(progress)).toBe(0);

    progress.piecesPlaced = 4;
    const first = tracker.check(progress);
    expect(first?.title).toBe('Estenda a linha');
    expect(tracker.current?.title).toBe('Ligue Canyon Town');

    progress.connectedTowns = ['canyon'];
    expect(tracker.check(progress)?.title).toBe('Ligue Canyon Town');
    expect(tracker.check(progress)).toBeNull();
  });
});
