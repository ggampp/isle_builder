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

    const headAfter = net.railhead;
    expect(net.undo().kind).toBe('straight');
    expect(net.count).toBe(2);
    expect(net.place('straight').ok).toBe(true);
    expect(net.railhead.x).toBeCloseTo(headAfter.x, 8);
    expect(net.railhead.z).toBeCloseTo(headAfter.z, 8);
  });

  it('restaurar um jogo salvo reproduz a mesma malha', () => {
    const a = freshNetwork();
    const kinds: PieceKind[] = ['straight', 'curveR', 'curveR', 'straight', 'sharpL'];
    for (const kind of kinds) a.place(kind);
    const branchId = a.addBranch(0, 12);
    expect(branchId).not.toBeNull();
    a.place('curveL');
    a.place('straight');

    const b = freshNetwork();
    b.restore(a.serialize());
    expect(b.serialize()).toEqual(a.serialize());
    expect(b.lineCount).toBe(a.lineCount);
    expect(b.count).toBe(a.count);
    for (const line of a.list()) {
      expect(b.path(line.id).totalLength).toBeCloseTo(a.path(line.id).totalLength, 8);
    }
  });

  it('um desvio herda o trecho da linha-mãe até a agulha', () => {
    const net = freshNetwork();
    for (let i = 0; i < 6; i++) net.place('straight');
    const mainPoses = net.posesFor(0).length;

    const branchId = net.addBranch(0, 20);
    if (branchId === null) throw new Error('desvio não criado');
    expect(net.activeLineId).toBe(branchId);
    // A ponta do desvio começa exatamente na pose da agulha.
    expect(net.railhead.x).toBeCloseTo(net.posesFor(0)[20].x, 10);

    net.place('curveR');
    const branchPath = net.path(branchId);
    expect(branchPath.points.length).toBeGreaterThan(21);
    // A linha-mãe segue intacta.
    expect(net.posesFor(0).length).toBe(mainPoses);
    // E o começo das duas coincide.
    expect(branchPath.points[5].x).toBeCloseTo(net.path(0).points[5].x, 10);
  });

  it('recusa desfazer um trecho de onde sai um desvio', () => {
    const net = freshNetwork();
    for (let i = 0; i < 4; i++) net.place('straight');
    const poses = net.posesFor(0).length;
    net.addBranch(0, poses - 2);

    net.setActiveLine(0);
    const result = net.undo();
    expect(result.kind).toBeNull();
    expect(result.reason).toMatch(/desvio/);
    expect(net.count).toBe(4);
  });

  it('a pedra no caminho barra a peça', () => {
    const net = freshNetwork();
    const ahead = net.railhead;
    const blocked = net.canPlace('straight', (x, z) =>
      Math.hypot(x - (ahead.x + 10), z - ahead.z) < 6);
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toMatch(/Pedra/);
    expect(net.canPlace('straight', () => false).ok).toBe(true);
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
