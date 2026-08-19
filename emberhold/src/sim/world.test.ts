import { describe, expect, it } from 'vitest';
import {
  ATTACK_MEMORY,
  BUILD_HP,
  COSTS,
  FIRST_WAVE,
  REPAIR_THRESHOLD,
  TOWER_DAMAGE,
  TOWER_RANGE,
  UNIT_HP,
  maxHp,
  maxMp,
  meleeDamage,
  pickaxeDamage,
  xpToNext,
} from './config.ts';
import { buildingAt, dist, footprintClear } from './map.ts';
import {
  canAfford,
  createWorld,
  grantXp,
  heroAttack,
  heroMagic,
  hurtBuilding,
  isUnderAttack,
  orderRepair,
  population,
  repairBuilding,
  tick,
  tryPlace,
} from './world.ts';
import type { Actor, World } from './types.ts';

const idle = { moveX: 0, moveY: 0, clickMove: null };

function worker(world: World): Actor {
  const u = world.units.find((x) => x.kind === 'worker');
  if (!u) throw new Error('no worker');
  return u;
}

function soldier(world: World): Actor {
  const u = world.units.find((x) => x.kind === 'soldier');
  if (!u) throw new Error('no soldier');
  return u;
}

function spawnFoe(world: World, kind: Actor['kind'], x: number, y: number): Actor {
  const hp = UNIT_HP[kind];
  const u: Actor = {
    id: world.nextId++,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    facing: 'se',
    anim: 'idle',
    animT: 0,
    moving: false,
    job: 'attack',
    targetId: null,
    targetX: x,
    targetY: y,
    attackCd: 0,
    patrolI: 0,
    homeX: x,
    homeY: y,
    chopResume: null,
  };
  world.units.push(u);
  return u;
}

describe('stats', () => {
  it('nível 1 começa com 80 HP e 40 MP', () => {
    expect(maxHp(1)).toBe(80);
    expect(maxMp(1)).toBe(40);
  });

  it('paredes e torres usam os HP aumentados do patch', () => {
    expect(BUILD_HP.wall).toBe(220);
    expect(BUILD_HP.tower).toBe(280);
    expect(BUILD_HP.fortress).toBeGreaterThan(BUILD_HP.house);
  });

  it('torre alcança 6.5 tiles e causa 14 de dano', () => {
    expect(TOWER_RANGE).toBe(6.5);
    expect(TOWER_DAMAGE).toBe(14);
  });

  it('três brutais de XP passam do limiar do nível 2', () => {
    expect(xpToNext(1)).toBe(28);
    expect(9 * 4).toBeGreaterThanOrEqual(xpToNext(1));
  });

  it('picareta e cutelo crescem com o nível', () => {
    expect(pickaxeDamage(3)).toBeGreaterThan(pickaxeDamage(1));
    expect(meleeDamage(3)).toBeGreaterThan(meleeDamage(1));
  });
});

describe('construção', () => {
  it('o keep inicial já tem fortaleza, casa, torres e um anel de paredes', () => {
    const world = createWorld();
    expect(world.buildings.some((b) => b.kind === 'fortress')).toBe(true);
    expect(world.buildings.some((b) => b.kind === 'house')).toBe(true);
    expect(world.buildings.filter((b) => b.kind === 'tower').length).toBeGreaterThanOrEqual(2);
    expect(world.buildings.filter((b) => b.kind === 'wall').length).toBeGreaterThan(10);
  });

  it('não coloca prédio em cima de outro', () => {
    const world = createWorld();
    const keep = world.buildings.find((b) => b.kind === 'fortress');
    if (!keep) throw new Error('keep');
    expect(footprintClear(world, keep.gx, keep.gy, keep.w, keep.h)).toBe(false);
    expect(tryPlace(world, 'wall', keep.gx, keep.gy)).toBeNull();
  });

  it('cobrar o custo e recusar se faltar madeira', () => {
    const world = createWorld();
    world.stock.wood = COSTS.tower.wood - 1;
    world.stock.stone = 99;
    expect(canAfford(world, 'tower')).toBe(false);
    world.stock.wood = COSTS.tower.wood;
    expect(canAfford(world, 'tower')).toBe(true);
  });
});

describe('reparo', () => {
  it('repara mesmo enquanto a estrutura está sob ataque', () => {
    const world = createWorld();
    const wall = world.buildings.find((b) => b.kind === 'wall');
    if (!wall) throw new Error('wall');
    wall.hp = 40;
    hurtBuilding(world, wall, 10);
    expect(isUnderAttack(world)).toBe(true);
    expect(wall.lastHitAt).toBe(world.time);
    const healed = repairBuilding(world, wall, 25);
    expect(healed).toBe(25);
    expect(wall.hp).toBe(55);
    expect(isUnderAttack(world)).toBe(true);
  });

  it('clique direito marca o prédio para o herói reparar', () => {
    const world = createWorld();
    const wall = world.buildings.find((b) => b.kind === 'wall');
    if (!wall) throw new Error('wall');
    wall.hp = 20;
    expect(orderRepair(world, wall.gx, wall.gy)).toBe(true);
    expect(world.hero.repairTarget).toBe(wall.id);
  });

  it('trabalhador larga o corte quando o prédio cai abaixo de 50%', () => {
    const world = createWorld();
    const w = worker(world);
    w.job = 'chop';
    w.x = 4;
    w.y = 4;
    const wall = world.buildings.find((b) => b.kind === 'wall');
    if (!wall) throw new Error('wall');
    wall.hp = wall.maxHp * REPAIR_THRESHOLD - 1;
    tick(world, 0.2, idle);
    expect(w.job).toBe('repair');
    expect(w.targetId).toBe(wall.id);
    expect(w.chopResume).not.toBeNull();
  });
});

describe('patrulha', () => {
  it('soldado prioriza defender quando a base está sob ataque', () => {
    const world = createWorld();
    const s = soldier(world);
    s.job = 'patrol';
    s.x = world.hero.x + 1;
    s.y = world.hero.y + 1;
    const foe = spawnFoe(world, 'wolf', s.x + 0.4, s.y);
    world.underAttackUntil = world.time + ATTACK_MEMORY;
    tick(world, 0.16, idle);
    expect(s.job).toBe('defend');
    expect(foe.hp).toBeLessThan(foe.maxHp);
  });

  it('trabalhador não continua cortando com a cidade em chamas se há prédio ferido', () => {
    const world = createWorld();
    const w = worker(world);
    w.job = 'chop';
    const wall = world.buildings.find((b) => b.kind === 'wall');
    if (!wall) throw new Error('wall');
    wall.hp = wall.maxHp - 5;
    world.underAttackUntil = world.time + ATTACK_MEMORY;
    tick(world, 0.1, idle);
    expect(w.job).toBe('repair');
  });
});

describe('torre e ondas', () => {
  it('torre dispara num lobo dentro do alcance', () => {
    const world = createWorld();
    const tower = world.buildings.find((b) => b.kind === 'tower');
    if (!tower) throw new Error('tower');
    tower.trainLeft = 0;
    spawnFoe(world, 'wolf', tower.gx + 1.2, tower.gy + 1.2);
    tick(world, 0.05, idle);
    expect(world.projectiles.length).toBeGreaterThan(0);
    expect(world.projectiles[0].from).toBe('tower');
    expect(world.projectiles[0].damage).toBe(TOWER_DAMAGE);
  });

  it('a primeira onda nasce depois do timer inicial', () => {
    const world = createWorld();
    expect(world.wave).toBe(0);
    expect(world.waveIn).toBe(FIRST_WAVE);
    tick(world, FIRST_WAVE + 0.05, idle);
    expect(world.wave).toBe(1);
    expect(world.units.some((u) => u.kind === 'wolf' || u.kind === 'slime')).toBe(true);
  });
});

describe('herói', () => {
  it('magia gasta mana e cria um projétil', () => {
    const world = createWorld();
    spawnFoe(world, 'slime', world.hero.x + 1, world.hero.y);
    const mp = world.hero.mp;
    expect(heroMagic(world)).toBe(true);
    expect(world.hero.mp).toBe(mp - 6);
    expect(world.projectiles.some((p) => p.from === 'hero')).toBe(true);
  });

  it('picareta acerta um nó adjacente', () => {
    const world = createWorld();
    const gx = Math.floor(world.hero.x) + 1;
    const gy = Math.floor(world.hero.y);
    world.tiles[gy][gx] = { kind: 'tree', hp: 8, maxHp: 8 };
    world.hero.x = gx + 0.2;
    world.hero.y = gy + 0.5;
    const before = world.tiles[gy][gx]?.hp ?? 0;
    expect(heroAttack(world)).toBe('mine');
    const after = world.tiles[gy][gx]?.hp ?? 0;
    expect(after).toBeLessThan(before);
  });

  it('XP sobe de nível, cura e aumenta o máximo', () => {
    const world = createWorld();
    world.hero.hp = 10;
    expect(grantXp(world, xpToNext(1))).toBe(true);
    expect(world.hero.level).toBe(2);
    expect(world.hero.hp).toBe(world.hero.maxHp);
    expect(world.hero.maxHp).toBe(maxHp(2));
  });
});

describe('casa treina trabalhador', () => {
  it('ao terminar o timer a casa gera um trabalhador se houver teto', () => {
    const world = createWorld();
    const house = world.buildings.find((b) => b.kind === 'house');
    if (!house) throw new Error('house');
    const before = population(world);
    house.trainLeft = 0.01;
    tick(world, 0.05, idle);
    expect(population(world)).toBe(before + 1);
  });
});

describe('mapa', () => {
  it('buildingAt devolve o prédio carimbado na grade', () => {
    const world = createWorld();
    const tower = world.buildings.find((b) => b.kind === 'tower');
    if (!tower) throw new Error('tower');
    expect(buildingAt(world, tower.gx, tower.gy)?.id).toBe(tower.id);
  });

  it('distância euclidiana bate com o esperado', () => {
    expect(dist(0, 0, 3, 4)).toBe(5);
  });
});
