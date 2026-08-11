import { beforeEach, describe, expect, it } from 'vitest';
import { SAVE_KEY, clearSave, readSave, writeSave } from './save.ts';

/** localStorage falso: o Vitest roda em Node, sem DOM. */
function installStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const fake = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
  (globalThis as unknown as { localStorage: unknown }).localStorage = fake;
  return store;
}

describe('jogo salvo', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = installStorage();
  });

  it('salva e relê a malha, as construções e os trens', () => {
    const ok = writeSave({
      version: 2,
      lines: [
        { anchorLineId: null, anchorPoseIndex: 0, kinds: ['straight', 'curveL'] },
        { anchorLineId: 0, anchorPoseIndex: 8, kinds: ['sharpR'] },
      ],
      buildings: [{ kind: 'house', x: 10, z: -4, rot: 0.5 }],
      trains: [{ lineId: 0, wagons: 5, condition: 88 }],
      blastedRocks: [3, 17],
      coins: 1234,
      score: 99,
      xp: 4321,
    });
    expect(ok).toBe(true);

    const loaded = readSave();
    expect(loaded).not.toBeNull();
    expect(loaded?.lines).toHaveLength(2);
    expect(loaded?.lines[1].anchorPoseIndex).toBe(8);
    expect(loaded?.buildings[0].kind).toBe('house');
    expect(loaded?.trains[0].wagons).toBe(5);
    expect(loaded?.blastedRocks).toEqual([3, 17]);
    expect(loaded?.coins).toBe(1234);
  });

  it('migra um save da versão 1 (linha única, sem desvios)', () => {
    store.set(SAVE_KEY, JSON.stringify({
      version: 1,
      track: ['straight', 'curveR', 'lixo'],
      buildings: [{ kind: 'shed', x: 1, z: 2, rot: 0 }],
      coins: 500,
      score: 10,
      xp: 20,
      wagons: 6,
      condition: 72,
    }));

    const loaded = readSave();
    expect(loaded?.version).toBe(2);
    expect(loaded?.lines).toHaveLength(1);
    // A peça inválida é descartada na leitura.
    expect(loaded?.lines[0].kinds).toEqual(['straight', 'curveR']);
    expect(loaded?.trains[0].wagons).toBe(6);
    expect(loaded?.trains[0].condition).toBe(72);
    expect(loaded?.blastedRocks).toEqual([]);
  });

  it('descarta lixo e versões desconhecidas em vez de quebrar o jogo', () => {
    store.set(SAVE_KEY, 'isto não é json');
    expect(readSave()).toBeNull();

    store.set(SAVE_KEY, JSON.stringify({ version: 99, lines: [] }));
    expect(readSave()).toBeNull();

    store.set(SAVE_KEY, JSON.stringify({
      version: 2,
      lines: [{ anchorLineId: null, anchorPoseIndex: 0, kinds: ['straight'] }],
      buildings: [{ kind: 'inexistente', x: 0, z: 0, rot: 0 }, 42, null],
      trains: 'nada disso',
      coins: 'muito',
    }));
    const loaded = readSave();
    expect(loaded?.buildings).toEqual([]);
    expect(loaded?.trains).toEqual([{ lineId: 0, wagons: 4, condition: 95 }]);
    expect(loaded?.coins).toBe(5960);
  });

  it('sem jogo salvo, devolve null', () => {
    clearSave();
    expect(readSave()).toBeNull();
  });
});
