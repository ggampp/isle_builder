import { describe, expect, it } from 'vitest';
import { WATER_LEVEL, heightAt } from '../world/heightfield.ts';
import { TOWNS } from '../world/towns.ts';
import { RailNetwork, closestOnPath, sampleAt } from './network.ts';
import { PIECE_SPECS } from './geometry.ts';
import type { PieceKind } from './geometry.ts';

const ORIGIN = { x: TOWNS[0].x + 8, z: TOWNS[0].z + 2, heading: -0.16 };

function freshNetwork(): RailNetwork {
  return new RailNetwork(ORIGIN);
}

describe('rede ferroviária', () => {
  it('começa vazia, com a ponta na origem', () => {
    const net = freshNetwork();
    expect(net.count).toBe(0);
    expect(net.railhead.x).toBeCloseTo(ORIGIN.x, 10);
    expect(net.railhead.z).toBeCloseTo(ORIGIN.z, 10);
  });

  it('assenta peças a partir da ponta e desfaz na ordem inversa', () => {
    const net = freshNetwork();
    const kinds: PieceKind[] = ['straight', 'curveL', 'straight'];
    for (const kind of kinds) expect(net.place(kind).ok).toBe(true);
    expect(net.count).toBe(3);
    expect(net.kinds()).toEqual(kinds);

    const headAfter = net.railhead;
    expect(net.undo()).toBe('straight');
    expect(net.count).toBe(2);
    expect(net.place('straight').ok).toBe(true);
    expect(net.railhead.x).toBeCloseTo(headAfter.x, 8);
    expect(net.railhead.z).toBeCloseTo(headAfter.z, 8);
  });

  it('restaurar uma lista de peças reproduz a mesma linha', () => {
    const a = freshNetwork();
    const kinds: PieceKind[] = ['straight', 'curveR', 'curveR', 'straight', 'sharpL'];
    for (const kind of kinds) a.place(kind);

    const b = freshNetwork();
    b.restore(kinds);
    expect(b.kinds()).toEqual(a.kinds());
    expect(b.path().totalLength).toBeCloseTo(a.path().totalLength, 8);
    expect(b.railhead.heading).toBeCloseTo(a.railhead.heading, 10);
  });

  it('o caminho nunca afunda abaixo do nível da água, mesmo cruzando o rio', () => {
    const net = freshNetwork();
    // Rumo ao sul o suficiente para alcançar o rio do outro lado do vale.
    for (let i = 0; i < 6; i++) net.place('sharpR');
    for (let i = 0; i < 40; i++) net.place('straight');
    const path = net.path();
    let crossedWater = false;
    for (const p of path.points) {
      expect(p.y).toBeGreaterThan(WATER_LEVEL);
      if (heightAt(p.x, p.z) < WATER_LEVEL) crossedWater = true;
    }
    // O trecho realmente passa sobre água: é ali que nasce a ponte de cavalete.
    expect(crossedWater).toBe(true);
  });

  it('o tabuleiro acompanha o solo em terra firme', () => {
    const net = freshNetwork();
    for (let i = 0; i < 8; i++) net.place('straight');
    for (const p of net.path().points) {
      const ground = heightAt(p.x, p.z);
      if (ground > WATER_LEVEL + 4) {
        expect(p.y).toBeGreaterThanOrEqual(ground);
        expect(p.y - ground).toBeLessThan(3);
      }
    }
  });

  it('recusa peças que saem dos limites do vale', () => {
    const net = freshNetwork();
    let blocked = false;
    for (let i = 0; i < 60; i++) {
      const check = net.place('straight');
      if (!check.ok) {
        blocked = true;
        expect(check.reason).toMatch(/limites|Rampa/);
        break;
      }
    }
    expect(blocked).toBe(true);
  });

  it('o comprimento do caminho acompanha o das peças assentadas', () => {
    const net = freshNetwork();
    const kinds: PieceKind[] = ['straight', 'straight', 'curveL', 'straight'];
    let expected = 0;
    for (const kind of kinds) {
      net.place(kind);
      expected += PIECE_SPECS[kind].length;
    }
    // O caminho sobe e desce com o relevo, então é sempre um pouco mais longo.
    expect(net.path().totalLength).toBeGreaterThanOrEqual(expected * 0.98);
    expect(net.path().totalLength).toBeLessThan(expected * 1.2);
  });

  it('sampleAt devolve posições contínuas e tangentes unitárias', () => {
    const net = freshNetwork();
    for (let i = 0; i < 10; i++) net.place(i % 3 === 0 ? 'curveL' : 'straight');
    const path = net.path();
    let previous = sampleAt(path, 0).position;
    for (let s = 2; s <= path.totalLength; s += 2) {
      const { position, tangent } = sampleAt(path, s);
      expect(Math.hypot(position.x - previous.x, position.y - previous.y, position.z - previous.z))
        .toBeLessThan(3);
      expect(Math.hypot(tangent.x, tangent.y, tangent.z)).toBeCloseTo(1, 6);
      previous = position;
    }
  });

  it('closestOnPath acha a estação mais próxima da linha', () => {
    const net = freshNetwork();
    for (let i = 0; i < 5; i++) net.place('straight');
    const path = net.path();
    const near = closestOnPath(path, ORIGIN.x, ORIGIN.z);
    expect(near.distance).toBeLessThan(1);
    expect(near.s).toBeLessThan(2);
  });
});
