import { describe, expect, it } from 'vitest';
import { VoxelGrid } from './grid.ts';
import { connectedComponents, damageAt, isSupported, voxelRaycast, voxelRaycastWorld } from './connectivity.ts';
import { VOXEL_SIZE } from './types.ts';
import { buildSaloon } from './saloon.ts';

describe('conectividade', () => {
  it('um bloco sozinho é um componente', () => {
    const g = new VoxelGrid();
    g.add(0, 2, 0, 'adobe', 'structure');
    expect(connectedComponents(g)).toHaveLength(1);
  });

  it('vizinhos ortogonais da estrutura ficam no mesmo componente', () => {
    const g = new VoxelGrid();
    g.add(0, 2, 0, 'adobe', 'structure');
    g.add(1, 2, 0, 'adobe', 'structure');
    g.add(1, 3, 0, 'wood', 'structure');
    expect(connectedComponents(g)).toHaveLength(1);
  });

  it('porta não se funde com a estrutura (junta, não contato)', () => {
    const g = new VoxelGrid();
    g.add(0, 2, 0, 'adobe', 'structure');
    g.add(1, 2, 0, 'plank', 'door-l');
    expect(connectedComponents(g)).toHaveLength(2);
  });

  it('remover o meio parte a coluna em dois', () => {
    const g = new VoxelGrid();
    const a = g.add(0, 2, 0, 'adobe', 'structure')!;
    const b = g.add(0, 3, 0, 'adobe', 'structure')!;
    const c = g.add(0, 4, 0, 'adobe', 'structure')!;
    g.remove(b);
    const comps = connectedComponents(g);
    expect(comps).toHaveLength(2);
    const ids = comps.map((comp) => comp.map((v) => v.id).sort().join(','));
    expect(ids).toContain(String(a.id));
    expect(ids).toContain(String(c.id));
  });
});

describe('suporte', () => {
  it('estrutura no deck (iy=1) está apoiada', () => {
    const g = new VoxelGrid();
    g.add(0, 1, 0, 'adobe', 'structure');
    expect(isSupported([...g.values()])).toBe(true);
  });

  it('estrutura flutuante cai', () => {
    const g = new VoxelGrid();
    g.add(0, 5, 0, 'adobe', 'structure');
    expect(isSupported([...g.values()])).toBe(false);
  });

  it('porta nunca conta como apoiada no chão', () => {
    const g = new VoxelGrid();
    g.add(0, 1, 0, 'plank', 'door-l');
    expect(isSupported([...g.values()])).toBe(false);
  });
});

describe('dano', () => {
  it('um impacto no centro destrói madeira fraca', () => {
    const g = new VoxelGrid();
    const v = g.add(0, 4, 0, 'plank', 'door-l')!;
    const hits = damageAt(g, 0, 4 * VOXEL_SIZE + VOXEL_SIZE * 0.5, 0, 0.25, 8, VOXEL_SIZE);
    expect(hits.map((h) => h.id)).toContain(v.id);
  });

  it('acerto direto destrói adobe numa tacada', () => {
    const g = new VoxelGrid();
    const v = g.add(0, 4, 0, 'adobe', 'structure')!;
    const c = { x: 0, y: 4 * VOXEL_SIZE + VOXEL_SIZE * 0.5, z: 0 };
    const hits = damageAt(g, c.x, c.y, c.z, 0.3, 14, VOXEL_SIZE, v);
    expect(hits.map((h) => h.id)).toContain(v.id);
  });

  it('aço aguenta um impacto que a madeira não aguenta', () => {
    const g = new VoxelGrid();
    g.add(0, 4, 0, 'steel', 'structure');
    const hits = damageAt(g, 0, 4 * VOXEL_SIZE + VOXEL_SIZE * 0.5, 0, 0.2, 8, VOXEL_SIZE);
    expect(hits).toHaveLength(0);
  });
});

describe('raycast', () => {
  it('acerta o voxel na frente da origem', () => {
    const g = new VoxelGrid();
    const v = g.add(0, 4, 2, 'adobe', 'structure')!;
    const hit = voxelRaycast(
      g,
      { x: 0, y: 4 * VOXEL_SIZE + VOXEL_SIZE * 0.5, z: 6 },
      { x: 0, y: 0, z: -1 },
      10,
      VOXEL_SIZE,
    );
    expect(hit?.voxel.id).toBe(v.id);
  });

  it('da posição inicial do jogador acerta o pórtico', () => {
    const g = buildSaloon();
    const hit = voxelRaycastWorld(
      g,
      { x: 0, y: 1.55, z: 7.45 },
      { x: 0, y: 0, z: -1 },
      42,
      VOXEL_SIZE,
      () => null,
    );
    expect(hit).not.toBeNull();
  });
});

describe('saloon', () => {
  it('nasce com portas, dobradiças, correntes e lanternas', () => {
    const g = buildSaloon();
    const groups = new Set([...g.values()].map((v) => v.group));
    expect(groups.has('structure')).toBe(true);
    expect(groups.has('door-l')).toBe(true);
    expect(groups.has('door-r')).toBe(true);
    expect(groups.has('door-o')).toBe(true);
    expect(groups.has('chain-0')).toBe(true);
    expect(groups.has('lantern-0')).toBe(true);
    const hinges = [...g.values()].filter((v) => v.mat === 'hinge');
    expect(hinges.length).toBeGreaterThanOrEqual(9);
    expect(g.size).toBeGreaterThan(400);
  });

  it('portas são de tábuas miúdas e a praça tem coreto', () => {
    const g = buildSaloon();
    const left = [...g.values()].filter((v) => v.group === 'door-l' && v.mat === 'plank');
    expect(left.length).toBeGreaterThan(50);
    const gazebo = [...g.values()].filter((v) => v.mat === 'wood' && v.ix < -20);
    expect(gazebo.length).toBeGreaterThan(40);
  });
});
