import {
  ATTACK_MEMORY,
  BASE_POP_CAP,
  BRUTE_SPEED,
  BUILD_HP,
  COSTS,
  CONTACT_COOLDOWN,
  FIRST_WAVE,
  FOOTPRINT,
  HERO_MELEE_RANGE,
  HERO_REPAIR_RATE,
  HERO_SPEED,
  MAGIC_COST,
  MAGIC_COOLDOWN,
  MAGIC_DAMAGE,
  MAGIC_RANGE,
  MAP_H,
  MAP_W,
  MAX_LEVEL,
  MINE_COOLDOWN,
  MINE_RANGE,
  NODE_YIELD,
  PET_COOLDOWN,
  PET_DAMAGE,
  PET_RANGE,
  PET_SPEED,
  POP_PER_HOUSE,
  REPAIR_RANGE,
  REPAIR_RESUME,
  REPAIR_THRESHOLD,
  SLIME_SPEED,
  SOLDIER_SPEED,
  START_FOOD,
  START_GOLD,
  START_STONE,
  START_WOOD,
  TOWER_COOLDOWN,
  TOWER_DAMAGE,
  TOWER_PROJ_SPEED,
  TOWER_RANGE,
  TRAIN_WORKER_TIME,
  UNIT_DAMAGE,
  UNIT_HP,
  WAVE_PERIOD,
  WOLF_SPEED,
  WORKER_REPAIR_RATE,
  WORKER_SPEED,
  XP_PER_KILL,
  maxHp,
  maxMp,
  meleeDamage,
  pickaxeDamage,
  xpToNext,
} from './config.ts';
import {
  buildingAt,
  buildingCenter,
  dist,
  dist2,
  facingFrom,
  footprintClear,
  hash,
  inBounds,
  makeBuilding,
  nearBuilding,
  nodeHp,
  stampBuilding,
  tileAt,
  unstampBuilding,
} from './map.ts';
import type {
  Actor,
  Anim,
  BuildKind,
  Building,
  Floater,
  Hero,
  Projectile,
  Stock,
  UnitKind,
  World,
} from './types.ts';

function emptyGrid<T>(fill: T): T[][] {
  return Array.from({ length: MAP_H }, () => Array.from({ length: MAP_W }, () => fill));
}

function makeActor(
  world: World,
  kind: UnitKind,
  x: number,
  y: number,
  extra?: Partial<Actor>,
): Actor {
  const hp = UNIT_HP[kind];
  return {
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
    job: kind === 'soldier' ? 'patrol' : kind === 'worker' ? 'chop' : kind === 'pet' ? 'follow' : 'idle',
    targetId: null,
    targetX: x,
    targetY: y,
    attackCd: 0,
    patrolI: 0,
    homeX: x,
    homeY: y,
    chopResume: null,
    ...extra,
  };
}

function log(world: World, line: string): void {
  world.logs.unshift(line);
  if (world.logs.length > 8) world.logs.pop();
}

function float(world: World, x: number, y: number, text: string, kind: Floater['kind']): void {
  world.floaters.push({ id: world.nextId++, x, y, text, kind, age: 0 });
}

function blocked(world: World, x: number, y: number, self: Actor | null): boolean {
  if (x < 0.4 || y < 0.4 || x >= MAP_W - 0.4 || y >= MAP_H - 0.4) return true;
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (!inBounds(gx, gy)) return true;
  if (world.occ[gy][gx]) return true;
  const node = world.tiles[gy][gx];
  if (!node) return false;
  if (self && (self.job === 'chop' || self.kind === 'hero') && dist(x, y, gx + 0.5, gy + 0.5) < 0.85) {
    return false;
  }
  return true;
}

function stepTowards(world: World, unit: Actor, tx: number, ty: number, speed: number, dt: number): boolean {
  const dx = tx - unit.x;
  const dy = ty - unit.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.12) {
    unit.moving = false;
    return true;
  }
  const step = speed * dt;
  const ux = dx / len;
  const uy = dy / len;
  let nx = unit.x + ux * step;
  let ny = unit.y + uy * step;
  if (blocked(world, nx, ny, unit)) {
    if (!blocked(world, nx, unit.y, unit)) ny = unit.y;
    else if (!blocked(world, unit.x, ny, unit)) nx = unit.x;
    else {
      nx = unit.x + -uy * step;
      ny = unit.y + ux * step;
      if (blocked(world, nx, ny, unit)) {
        unit.moving = false;
        return false;
      }
    }
  }
  unit.x = nx;
  unit.y = ny;
  unit.facing = facingFrom(ux, uy);
  unit.moving = true;
  if (unit.anim !== 'attack' && unit.anim !== 'chop' && unit.anim !== 'repair') unit.anim = 'walk';
  return false;
}

function playAnim(unit: Actor, anim: Anim): void {
  if (unit.anim !== anim) {
    unit.anim = anim;
    unit.animT = 0;
  }
}

function pay(stock: Stock, kind: BuildKind): boolean {
  const cost = COSTS[kind];
  if (stock.wood < cost.wood || stock.stone < cost.stone) return false;
  stock.wood -= cost.wood;
  stock.stone -= cost.stone;
  return true;
}

function recountPop(world: World): void {
  const houses = world.buildings.filter((b) => b.kind === 'house' || b.kind === 'fortress').length;
  world.popCap = BASE_POP_CAP + houses * POP_PER_HOUSE;
}

export function population(world: World): number {
  return world.units.filter((u) => u.kind === 'worker' || u.kind === 'soldier').length + 1;
}

export function canAfford(world: World, kind: BuildKind): boolean {
  const cost = COSTS[kind];
  return world.stock.wood >= cost.wood && world.stock.stone >= cost.stone;
}

export function tryPlace(world: World, kind: BuildKind, gx: number, gy: number): Building | null {
  const foot = FOOTPRINT[kind];
  if (!footprintClear(world, gx, gy, foot.w, foot.h)) return null;
  if (!pay(world.stock, kind)) return null;
  const b = makeBuilding(world, kind, gx, gy);
  world.buildings.push(b);
  stampBuilding(world, b);
  if (kind === 'house') b.trainLeft = TRAIN_WORKER_TIME;
  recountPop(world);
  const names: Record<BuildKind, string> = {
    wall: 'parede de madeira',
    tower: 'torre de madeira',
    house: 'casa',
    fortress: 'fortaleza',
  };
  log(world, `Ergueu uma ${names[kind]} na sua terra.`);
  return b;
}

export function demolish(world: World, b: Building): void {
  unstampBuilding(world, b);
  world.buildings = world.buildings.filter((x) => x.id !== b.id);
  recountPop(world);
  log(world, 'Estrutura demolida.');
}

export function hurtBuilding(world: World, b: Building, amount: number): number {
  if (amount <= 0 || b.hp <= 0) return 0;
  const dealt = Math.min(b.hp, amount);
  b.hp -= dealt;
  b.lastHitAt = world.time;
  world.underAttackUntil = world.time + ATTACK_MEMORY;
  if (b.hp <= 0) {
    log(world, `${labelBuilding(b)} desabou!`);
    demolish(world, b);
  }
  return dealt;
}

function labelBuilding(b: Building): string {
  if (b.kind === 'wall') return 'Parede de madeira';
  if (b.kind === 'tower') return 'Torre';
  if (b.kind === 'house') return 'Casa';
  return 'Fortaleza';
}

export function repairBuilding(_world: World, b: Building, amount: number): number {
  if (amount <= 0 || b.hp <= 0) return 0;
  const room = b.maxHp - b.hp;
  const healed = Math.min(room, amount);
  b.hp += healed;
  return healed;
}

export function isUnderAttack(world: World): boolean {
  return world.time < world.underAttackUntil;
}

export function damagedBuildings(world: World, ratio: number): Building[] {
  return world.buildings.filter((b) => b.hp < b.maxHp * ratio);
}

function nearestDamaged(world: World, x: number, y: number, ratio: number): Building | null {
  let best: Building | null = null;
  let bestD = Infinity;
  for (const b of world.buildings) {
    if (b.hp >= b.maxHp * ratio) continue;
    const c = buildingCenter(b);
    const d = dist2(x, y, c.x, c.y);
    if (d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

function nearestNode(world: World, x: number, y: number, kind?: TileNodeKind): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let gy = 0; gy < MAP_H; gy++) {
    for (let gx = 0; gx < MAP_W; gx++) {
      const n = world.tiles[gy][gx];
      if (!n) continue;
      if (kind && n.kind !== kind) continue;
      const d = dist2(x, y, gx + 0.5, gy + 0.5);
      if (d < bestD) {
        best = { x: gx + 0.5, y: gy + 0.5 };
        bestD = d;
      }
    }
  }
  return best;
}

type TileNodeKind = NonNullable<World['tiles'][0][0]>['kind'];

function nearestEnemy(world: World, x: number, y: number, range: number): Actor | null {
  let best: Actor | null = null;
  let bestD = range * range;
  for (const u of world.units) {
    if (!isFoe(u) || u.hp <= 0) continue;
    const d = dist2(x, y, u.x, u.y);
    if (d < bestD) {
      best = u;
      bestD = d;
    }
  }
  return best;
}

function isFoe(u: Actor): boolean {
  return u.kind === 'wolf' || u.kind === 'slime' || u.kind === 'brute';
}

function isFriend(u: Actor): boolean {
  return u.kind === 'hero' || u.kind === 'worker' || u.kind === 'soldier' || u.kind === 'pet';
}

function nearestPrey(world: World, x: number, y: number): { kind: 'unit' | 'building'; unit?: Actor; building?: Building } | null {
  let bestD = Infinity;
  let best: { kind: 'unit' | 'building'; unit?: Actor; building?: Building } | null = null;
  for (const u of world.units) {
    if (!isFriend(u) || u.hp <= 0) continue;
    const d = dist2(x, y, u.x, u.y);
    if (d < bestD) {
      bestD = d;
      best = { kind: 'unit', unit: u };
    }
  }
  for (const b of world.buildings) {
    const c = buildingCenter(b);
    const d = dist2(x, y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      best = { kind: 'building', building: b };
    }
  }
  return best;
}

function harvestNode(world: World, gx: number, gy: number): void {
  const node = world.tiles[gy][gx];
  if (!node) return;
  const yield_ = NODE_YIELD[node.kind];
  world.stock.wood += yield_.wood;
  world.stock.stone += yield_.stone;
  world.stock.gold += yield_.gold;
  world.stock.food += yield_.food;
  world.tiles[gy][gx] = null;
  const label = node.kind === 'tree' ? `+${yield_.wood} madeira` : node.kind === 'rock' ? `+${yield_.stone} pedra` : `+${yield_.gold} ouro`;
  float(world, gx + 0.5, gy + 0.5, label, 'loot');
}

function hitNode(world: World, x: number, y: number, dmg: number): boolean {
  const gx = Math.floor(x);
  const gy = Math.floor(y);
  if (!inBounds(gx, gy)) return false;
  const node = world.tiles[gy][gx];
  if (!node) return false;
  node.hp -= dmg;
  if (node.hp <= 0) harvestNode(world, gx, gy);
  return true;
}

function hurtUnit(world: World, u: Actor, amount: number, hx: number, hy: number): number {
  if (amount <= 0 || u.hp <= 0) return 0;
  const dealt = Math.min(u.hp, amount);
  u.hp -= dealt;
  float(world, u.x, u.y - 0.4, `-${dealt}`, 'dmg');
  if (u.hp <= 0) {
    if (isFoe(u)) {
      world.killed += 1;
      world.stock.gold += 1;
      grantXp(world, XP_PER_KILL + (u.kind === 'brute' ? 14 : 0));
    }
    if (u.kind !== 'hero' && u.kind !== 'pet') {
      world.units = world.units.filter((x) => x.id !== u.id);
    }
  } else {
    const dx = u.x - hx;
    const dy = u.y - hy;
    const len = Math.hypot(dx, dy) || 1;
    u.x += (dx / len) * 0.08;
    u.y += (dy / len) * 0.08;
  }
  return dealt;
}

export function grantXp(world: World, amount: number): boolean {
  if (world.hero.level >= MAX_LEVEL) return false;
  world.hero.xp += amount;
  float(world, world.hero.x, world.hero.y - 0.6, `+${amount} XP`, 'xp');
  let leveled = false;
  while (world.hero.level < MAX_LEVEL && world.hero.xp >= xpToNext(world.hero.level)) {
    world.hero.xp -= xpToNext(world.hero.level);
    world.hero.level += 1;
    world.hero.maxHp = maxHp(world.hero.level);
    world.hero.maxMp = maxMp(world.hero.level);
    world.hero.hp = world.hero.maxHp;
    world.hero.mp = world.hero.maxMp;
    leveled = true;
    log(world, `Nível ${world.hero.level}! A picareta ficou mais pesada.`);
  }
  return leveled;
}

export function heroAttack(world: World): 'mine' | 'melee' | null {
  const hero = world.hero;
  if (hero.attackCd > 0 || hero.hp <= 0) return null;
  const foe = nearestEnemy(world, hero.x, hero.y, HERO_MELEE_RANGE);
  hero.attackCd = MINE_COOLDOWN;
  playAnim(hero, foe ? 'attack' : 'chop');
  if (foe) {
    hurtUnit(world, foe, meleeDamage(hero.level), hero.x, hero.y);
    return 'melee';
  }
  const node = closestNodeAround(world, hero.x, hero.y, MINE_RANGE);
  if (node) {
    hitNode(world, node.x, node.y, pickaxeDamage(hero.level));
    return 'mine';
  }
  return null;
}

function closestNodeAround(world: World, x: number, y: number, range: number): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = range;
  for (let gy = Math.floor(y) - 2; gy <= Math.floor(y) + 2; gy++) {
    for (let gx = Math.floor(x) - 2; gx <= Math.floor(x) + 2; gx++) {
      if (!inBounds(gx, gy) || !world.tiles[gy][gx]) continue;
      const d = dist(x, y, gx + 0.5, gy + 0.5);
      if (d < bestD) {
        best = { x: gx + 0.5, y: gy + 0.5 };
        bestD = d;
      }
    }
  }
  return best;
}

export function heroMagic(world: World): boolean {
  const hero = world.hero;
  if (hero.hp <= 0 || hero.mp < MAGIC_COST || hero.attackCd > 0) return false;
  const foe = nearestEnemy(world, hero.x, hero.y, MAGIC_RANGE);
  if (!foe) return false;
  hero.mp -= MAGIC_COST;
  hero.attackCd = MAGIC_COOLDOWN;
  playAnim(hero, 'attack');
  spawnProjectile(world, hero.x, hero.y, foe.x, foe.y, MAGIC_DAMAGE + (hero.level - 1) * 3, 'hero');
  return true;
}

export function heroRepairTick(world: World, dt: number): boolean {
  const id = world.hero.repairTarget;
  if (id == null) return false;
  const b = world.buildings.find((x) => x.id === id);
  if (!b || b.hp >= b.maxHp) {
    world.hero.repairTarget = null;
    return false;
  }
  if (!nearBuilding(world.hero.x, world.hero.y, b, REPAIR_RANGE)) {
    const c = buildingCenter(b);
    stepTowards(world, world.hero, c.x, c.y, HERO_SPEED, dt);
    return true;
  }
  playAnim(world.hero, 'repair');
  world.hero.moving = false;
  const healed = repairBuilding(world, b, HERO_REPAIR_RATE * dt);
  if (healed > 0) float(world, world.hero.x, world.hero.y - 0.5, `+${Math.ceil(healed)}`, 'heal');
  if (b.hp >= b.maxHp) world.hero.repairTarget = null;
  return true;
}

export function orderRepair(world: World, gx: number, gy: number): boolean {
  const b = buildingAt(world, gx, gy);
  if (!b) return false;
  world.hero.repairTarget = b.id;
  world.moveGoal = null;
  log(world, `Reparando ${labelBuilding(b).toLowerCase()} (${Math.ceil(b.hp)}/${b.maxHp}).`);
  return true;
}

function spawnProjectile(
  world: World,
  x: number,
  y: number,
  tx: number,
  ty: number,
  damage: number,
  from: Projectile['from'],
): void {
  world.projectiles.push({
    id: world.nextId++,
    x,
    y,
    tx,
    ty,
    speed: from === 'tower' ? TOWER_PROJ_SPEED : 14,
    damage,
    from,
    life: 1.4,
  });
}

function tickProjectiles(world: World, dt: number): void {
  const keep: Projectile[] = [];
  for (const p of world.projectiles) {
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.2 || p.life <= 0) {
      const foe = nearestEnemy(world, p.tx, p.ty, 0.7);
      if (foe) hurtUnit(world, foe, p.damage, p.x, p.y);
      continue;
    }
    p.x += (dx / len) * p.speed * dt;
    p.y += (dy / len) * p.speed * dt;
    p.life -= dt;
    keep.push(p);
  }
  world.projectiles = keep;
}

function tickTowers(world: World, dt: number): void {
  for (const b of world.buildings) {
    if (b.kind !== 'tower') continue;
    b.trainLeft = Math.max(0, b.trainLeft - dt);
    if (b.trainLeft > 0) continue;
    const c = buildingCenter(b);
    const foe = nearestEnemy(world, c.x, c.y, TOWER_RANGE);
    if (!foe) continue;
    spawnProjectile(world, c.x, c.y - 0.6, foe.x, foe.y, TOWER_DAMAGE, 'tower');
    b.trainLeft = TOWER_COOLDOWN;
  }
}

function patrolPoint(i: number): { x: number; y: number } {
  const cx = MAP_W / 2;
  const cy = MAP_H / 2;
  const r = 6.5;
  const pts = [
    { x: cx - r, y: cy - r },
    { x: cx + r, y: cy - r },
    { x: cx + r, y: cy + r },
    { x: cx - r, y: cy + r },
  ];
  return pts[i % pts.length];
}

function tickWorker(world: World, u: Actor, dt: number): void {
  const critical = nearestDamaged(world, u.x, u.y, REPAIR_THRESHOLD);
  if (critical) {
    if (u.job === 'chop' && !u.chopResume) u.chopResume = { x: u.targetX, y: u.targetY };
    u.job = 'repair';
    u.targetId = critical.id;
  } else if (u.job === 'repair') {
    const still = u.targetId != null ? world.buildings.find((b) => b.id === u.targetId) : null;
    if (!still || still.hp >= still.maxHp * REPAIR_RESUME) {
      u.job = 'chop';
      u.targetId = null;
    }
  } else if (isUnderAttack(world) && u.job === 'chop') {
    const any = nearestDamaged(world, u.x, u.y, 0.999);
    if (any) {
      if (!u.chopResume) u.chopResume = { x: u.targetX, y: u.targetY };
      u.job = 'repair';
      u.targetId = any.id;
    }
  }

  if (u.job === 'repair' && u.targetId != null) {
    const b = world.buildings.find((x) => x.id === u.targetId);
    if (!b) {
      u.job = 'chop';
      u.targetId = null;
    } else {
      if (!nearBuilding(u.x, u.y, b, REPAIR_RANGE)) {
        const c = buildingCenter(b);
        stepTowards(world, u, c.x, c.y, WORKER_SPEED, dt);
        return;
      }
      playAnim(u, 'repair');
      u.moving = false;
      repairBuilding(world, b, WORKER_REPAIR_RATE * dt);
      return;
    }
  }

  u.job = 'chop';
  if (u.chopResume) {
    u.targetX = u.chopResume.x;
    u.targetY = u.chopResume.y;
    u.chopResume = null;
  }
  const here = tileAt(world, u.targetX, u.targetY);
  if (!here) {
    const n = nearestNode(world, u.x, u.y, 'tree') ?? nearestNode(world, u.x, u.y);
    if (!n) {
      playAnim(u, 'idle');
      u.moving = false;
      return;
    }
    u.targetX = n.x;
    u.targetY = n.y;
  }
  if (dist(u.x, u.y, u.targetX, u.targetY) > MINE_RANGE) {
    stepTowards(world, u, u.targetX, u.targetY, WORKER_SPEED, dt);
    return;
  }
  playAnim(u, 'chop');
  u.moving = false;
  u.attackCd -= dt;
  if (u.attackCd <= 0) {
    u.attackCd = MINE_COOLDOWN;
    hitNode(world, u.targetX, u.targetY, 7);
  }
}

function tickSoldier(world: World, u: Actor, dt: number): void {
  const foe = nearestEnemy(world, u.x, u.y, isUnderAttack(world) ? 14 : 4.2);
  if (foe) {
    u.job = 'defend';
    if (dist(u.x, u.y, foe.x, foe.y) > 0.95) {
      stepTowards(world, u, foe.x, foe.y, SOLDIER_SPEED, dt);
      return;
    }
    playAnim(u, 'attack');
    u.moving = false;
    u.attackCd -= dt;
    if (u.attackCd <= 0) {
      u.attackCd = 0.55;
      hurtUnit(world, foe, UNIT_DAMAGE.soldier, u.x, u.y);
    }
    return;
  }
  u.job = 'patrol';
  const pt = patrolPoint(u.patrolI);
  if (stepTowards(world, u, pt.x, pt.y, SOLDIER_SPEED * 0.7, dt)) u.patrolI += 1;
}

function tickPet(world: World, u: Actor, dt: number): void {
  const foe = nearestEnemy(world, world.hero.x, world.hero.y, 3.4);
  if (foe) {
    u.job = 'attack';
    if (dist(u.x, u.y, foe.x, foe.y) > PET_RANGE) {
      stepTowards(world, u, foe.x, foe.y, PET_SPEED, dt);
      return;
    }
    playAnim(u, 'attack');
    u.moving = false;
    u.attackCd -= dt;
    if (u.attackCd <= 0) {
      u.attackCd = PET_COOLDOWN;
      hurtUnit(world, foe, PET_DAMAGE, u.x, u.y);
    }
    return;
  }
  u.job = 'follow';
  const behind = {
    x: world.hero.x - Math.cos(world.time) * 0.55,
    y: world.hero.y - Math.sin(world.time * 0.8) * 0.55,
  };
  if (dist(u.x, u.y, behind.x, behind.y) > 0.35) stepTowards(world, u, behind.x, behind.y, PET_SPEED, dt);
  else {
    u.moving = false;
    playAnim(u, 'idle');
  }
}

function tickFoe(world: World, u: Actor, dt: number): void {
  const speed = u.kind === 'wolf' ? WOLF_SPEED : u.kind === 'brute' ? BRUTE_SPEED : SLIME_SPEED;
  const prey = nearestPrey(world, u.x, u.y);
  if (!prey) return;
  if (prey.kind === 'unit' && prey.unit) {
    const t = prey.unit;
    if (dist(u.x, u.y, t.x, t.y) > 0.9) {
      stepTowards(world, u, t.x, t.y, speed, dt);
      return;
    }
    playAnim(u, 'attack');
    u.moving = false;
    u.attackCd -= dt;
    if (u.attackCd <= 0) {
      u.attackCd = CONTACT_COOLDOWN;
      hurtUnit(world, t, UNIT_DAMAGE[u.kind as 'wolf' | 'slime' | 'brute'], u.x, u.y);
    }
    return;
  }
  if (prey.building) {
    const b = prey.building;
    if (!nearBuilding(u.x, u.y, b, 0.95)) {
      const c = buildingCenter(b);
      stepTowards(world, u, c.x, c.y, speed, dt);
      return;
    }
    playAnim(u, 'attack');
    u.moving = false;
    u.attackCd -= dt;
    if (u.attackCd <= 0) {
      u.attackCd = u.kind === 'brute' ? 1.1 : 0.8;
      const dmg = UNIT_DAMAGE[u.kind as 'wolf' | 'slime' | 'brute'];
      hurtBuilding(world, b, dmg);
      float(world, u.x, u.y - 0.3, `-${dmg}`, 'dmg');
    }
  }
}

function spawnWave(world: World): void {
  world.wave += 1;
  const n = 3 + world.wave;
  const kinds: UnitKind[] = [];
  for (let i = 0; i < n; i++) kinds.push(i % 3 === 2 ? 'slime' : 'wolf');
  if (world.wave % 2 === 1) kinds.push('brute');
  for (let i = 0; i < kinds.length; i++) {
    const edge = i % 4;
    let x = 2;
    let y = 2;
    if (edge === 0) {
      x = 2 + (i * 3) % (MAP_W - 4);
      y = 1.6;
    } else if (edge === 1) {
      x = MAP_W - 1.6;
      y = 2 + (i * 3) % (MAP_H - 4);
    } else if (edge === 2) {
      x = 2 + (i * 3) % (MAP_W - 4);
      y = MAP_H - 1.6;
    } else {
      x = 1.6;
      y = 2 + (i * 3) % (MAP_H - 4);
    }
    world.units.push(makeActor(world, kinds[i], x, y, { job: 'attack' }));
  }
  log(world, `Onda ${world.wave} — ${kinds.length} criaturas nas bordas!`);
  world.waveIn = WAVE_PERIOD;
}

function tickHouses(world: World, dt: number): void {
  for (const b of world.buildings) {
    if (b.kind !== 'house' || b.trainLeft <= 0) continue;
    b.trainLeft -= dt;
    if (b.trainLeft > 0) continue;
    if (population(world) >= world.popCap) {
      b.trainLeft = TRAIN_WORKER_TIME;
      continue;
    }
    const c = buildingCenter(b);
    const worker = makeActor(world, 'worker', c.x + 0.8, c.y + 0.8);
    world.units.push(worker);
    log(world, 'Trabalhador treinado e pronto.');
  }
}

function tickHeroMove(world: World, input: TickInput, dt: number): void {
  const hero = world.hero;
  if (hero.hp <= 0) return;
  hero.mp = Math.min(hero.maxMp, hero.mp + dt * 3.2);
  if (heroRepairTick(world, dt)) return;

  let mx = input.moveX;
  let my = input.moveY;
  if (input.clickMove) world.moveGoal = { x: input.clickMove.x, y: input.clickMove.y };
  if ((mx !== 0 || my !== 0) && world.moveGoal) world.moveGoal = null;

  if (world.moveGoal) {
    if (stepTowards(world, hero, world.moveGoal.x, world.moveGoal.y, HERO_SPEED, dt)) {
      world.moveGoal = null;
    }
  } else if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my) || 1;
    mx /= len;
    my /= len;
    stepTowards(world, hero, hero.x + mx * 1.4, hero.y + my * 1.4, HERO_SPEED, dt);
  } else {
    hero.moving = false;
    if (hero.anim === 'walk') playAnim(hero, 'idle');
  }
}

export interface TickInput {
  moveX: number;
  moveY: number;
  clickMove: { x: number; y: number } | null;
}

export interface TickEvents {
  leveled: boolean;
  mined: boolean;
  magicked: boolean;
  towerShot: boolean;
  wave: boolean;
  died: boolean;
}

export function tick(world: World, dt: number, input: TickInput): TickEvents {
  const towersBefore = world.projectiles.length;
  const waveBefore = world.wave;
  const hpBefore = world.hero.hp;
  const levelBefore = world.hero.level;

  world.time += dt;
  world.hero.attackCd = Math.max(0, world.hero.attackCd - dt);

  tickHeroMove(world, input, dt);
  tickHouses(world, dt);
  tickTowers(world, dt);
  tickProjectiles(world, dt);

  for (const u of [...world.units]) {
    if (u.hp <= 0) continue;
    u.animT += dt;
    if (u.kind === 'worker') tickWorker(world, u, dt);
    else if (u.kind === 'soldier') tickSoldier(world, u, dt);
    else if (u.kind === 'pet') tickPet(world, u, dt);
    else if (isFoe(u)) tickFoe(world, u, dt);
    if (!u.moving && u.anim === 'walk') playAnim(u, 'idle');
  }
  world.hero.animT += dt;
  world.pet.animT += dt;
  if (world.pet.hp > 0) tickPet(world, world.pet, dt);

  world.waveIn -= dt;
  let waved = false;
  if (world.waveIn <= 0) {
    spawnWave(world);
    waved = true;
  }

  world.floaters = world.floaters.filter((f) => {
    f.age += dt;
    f.y -= dt * 0.45;
    return f.age < 0.9;
  });

  if (world.hero.hp <= 0 && hpBefore > 0) log(world, 'Você caiu. R para recomeçar.');

  const aliveFriends = world.units.some((u) => u.kind === 'soldier' || u.kind === 'worker');
  world.won = world.wave >= 6 && !world.units.some(isFoe) && aliveFriends && world.hero.hp > 0;

  return {
    leveled: world.hero.level > levelBefore,
    mined: false,
    magicked: false,
    towerShot: world.projectiles.length > towersBefore,
    wave: waved || world.wave > waveBefore,
    died: hpBefore > 0 && world.hero.hp <= 0,
  };
}

function scatterNodes(world: World): void {
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x > MAP_W / 2 - 8 && x < MAP_W / 2 + 8 && y > MAP_H / 2 - 8 && y < MAP_H / 2 + 8) continue;
      const h = hash(x, y, world.seed);
      if (h < 0.055) {
        world.tiles[y][x] = { kind: 'tree', hp: nodeHp('tree'), maxHp: nodeHp('tree') };
      } else if (h < 0.072) {
        world.tiles[y][x] = { kind: 'rock', hp: nodeHp('rock'), maxHp: nodeHp('rock') };
      } else if (h < 0.078) {
        world.tiles[y][x] = { kind: 'crystal', hp: nodeHp('crystal'), maxHp: nodeHp('crystal') };
      }
    }
  }
}

function ringWalls(world: World, x0: number, y0: number, x1: number, y1: number): void {
  for (let x = x0; x <= x1; x++) {
    placeFree(world, 'wall', x, y0);
    placeFree(world, 'wall', x, y1);
  }
  for (let y = y0 + 1; y < y1; y++) {
    placeFree(world, 'wall', x0, y);
    placeFree(world, 'wall', x1, y);
  }
  unstampIf(world, Math.floor((x0 + x1) / 2), y1);
  unstampIf(world, Math.floor((x0 + x1) / 2) + 1, y1);
}

function unstampIf(world: World, gx: number, gy: number): void {
  const b = buildingAt(world, gx, gy);
  if (b && b.kind === 'wall') demolish(world, b);
}

function placeFree(world: World, kind: BuildKind, gx: number, gy: number): Building | null {
  const foot = FOOTPRINT[kind];
  if (!footprintClear(world, gx, gy, foot.w, foot.h)) return null;
  const b = makeBuilding(world, kind, gx, gy);
  world.buildings.push(b);
  stampBuilding(world, b);
  return b;
}

export function createWorld(seed = 2089053): World {
  const tiles = emptyGrid<World['tiles'][0][0]>(null);
  const occ = emptyGrid<number>(0);
  const hero: Hero = {
    id: 1,
    kind: 'hero',
    x: MAP_W / 2 + 0.5,
    y: MAP_H / 2 + 2.2,
    hp: maxHp(1),
    maxHp: maxHp(1),
    mp: maxMp(1),
    maxMp: maxMp(1),
    level: 1,
    xp: 0,
    facing: 'se',
    anim: 'idle',
    animT: 0,
    moving: false,
    job: 'idle',
    targetId: null,
    targetX: 0,
    targetY: 0,
    attackCd: 0,
    patrolI: 0,
    homeX: MAP_W / 2,
    homeY: MAP_H / 2,
    chopResume: null,
    repairTarget: null,
  };

  const world: World = {
    time: 0,
    seed,
    nextId: 2,
    tiles,
    occ,
    buildings: [],
    units: [],
    hero,
    pet: hero as unknown as Actor,
    stock: { wood: START_WOOD, stone: START_STONE, gold: START_GOLD, food: START_FOOD },
    projectiles: [],
    floaters: [],
    logs: ['A terra é sua. Minere, ergue paredes, treine mãos.'],
    wave: 0,
    waveIn: FIRST_WAVE,
    underAttackUntil: -999,
    popCap: BASE_POP_CAP,
    selected: null,
    moveGoal: null,
    killed: 0,
    won: false,
  };

  scatterNodes(world);

  const cx = Math.floor(MAP_W / 2);
  const cy = Math.floor(MAP_H / 2);
  placeFree(world, 'fortress', cx - 1, cy - 2);
  placeFree(world, 'house', cx - 4, cy - 1);
  placeFree(world, 'tower', cx + 3, cy - 3);
  placeFree(world, 'tower', cx - 4, cy + 2);
  ringWalls(world, cx - 6, cy - 5, cx + 5, cy + 4);
  recountPop(world);

  world.pet = makeActor(world, 'pet', hero.x - 0.7, hero.y + 0.4);
  world.units.push(makeActor(world, 'worker', cx - 2.5, cy + 1.2));
  world.units.push(makeActor(world, 'worker', cx + 1.8, cy + 1.6));
  world.units.push(makeActor(world, 'soldier', cx - 3.2, cy + 2.4, { patrolI: 0 }));
  world.units.push(makeActor(world, 'soldier', cx + 2.6, cy - 3.1, { patrolI: 2 }));

  log(world, 'Dois trabalhadores e uma patrulha já estão no pátio.');
  return world;
}

export function buildingHp(kind: BuildKind): number {
  return BUILD_HP[kind];
}
