import { SIM_CONFIG } from './config.ts';
import type { FishAgent, MarineAgent, ShipAgent, VillagerAgent } from './types.ts';
import { EntityKind } from './types.ts';
import type { Tilemap } from '../world/tilemap.ts';
import type { CoastManager } from '../world/coast.ts';
import {
  TerrainCensusTracker,
  pickWalkTarget,
  targetFishCount,
  targetMarineCount,
  targetShipCount,
  targetVillagerCount,
  type TerrainCensus,
} from './census.ts';
import {
  findNearestDeepWater,
  findNearestWalkable,
  isDeepWaterTile,
  isShallowWaterTile,
  isWalkableTile,
  isWaterTile,
  pickDirFromDelta,
  tileCenter,
  worldToTile,
} from './walkability.ts';

export class EntityManager {
  readonly villagers: VillagerAgent[] = [];
  readonly fish: FishAgent[] = [];
  readonly marine: MarineAgent[] = [];
  readonly ships: ShipAgent[] = [];

  paused = false;
  simTime = 0;

  private readonly censusTracker = new TerrainCensusTracker();
  private census: TerrainCensus = this.censusTracker.get();
  private accum = 0;
  private spawnTimer = 0;
  private censusTimer = 0;

  // Simulation Modifiers
  private simSpeedMultiplier = 1.0;
  private densityMultipliers = {
    villagers: 0.75,
    fish: 0.60,
    whales: 0.40,
    ships: 0.30
  };
  private autoRepopulate = true;

  private readonly tilemap: Tilemap;
  private readonly coast: CoastManager;

  constructor(tilemap: Tilemap, coast: CoastManager) {
    this.tilemap = tilemap;
    this.coast = coast;
  }

  onTerrainChanged(): void {
    this.censusTracker.markDirty();
  }

  setPaused(value: boolean): void {
    this.paused = value;
  }

  getCensus(): TerrainCensus {
    return this.census;
  }

  update(dt: number, _cameraX: number, _cameraY: number): void {
    if (this.paused) return;

    this.accum += dt;
    this.spawnTimer += dt;
    this.censusTimer += dt;

    if (this.censusTimer >= 1.5 || this.census.walkableSamples.length === 0) {
      this.census = this.censusTracker.rebuild(this.tilemap, this.coast);
      this.censusTimer = 0;
    }

    while (this.accum >= SIM_CONFIG.fixedDt) {
      this.fixedStep(SIM_CONFIG.fixedDt * this.simSpeedMultiplier);
      this.accum -= SIM_CONFIG.fixedDt;
      this.simTime += SIM_CONFIG.fixedDt * this.simSpeedMultiplier;
    }
  }

  setSpeedMultiplier(mult: number): void {
    this.simSpeedMultiplier = mult;
  }

  setDensityMultiplier(type: 'villagers' | 'fish' | 'whales' | 'ships', mult: number): void {
    this.densityMultipliers[type] = mult;
  }

  setAutoRepopulate(enabled: boolean): void {
    this.autoRepopulate = enabled;
  }

  repopulateNow(): void {
    this.villagers.length = 0;
    this.fish.length = 0;
    this.marine.length = 0;
    this.ships.length = 0;
    this.trySpawn();
  }

  private fixedStep(dt: number): void {
    if (this.autoRepopulate) {
      if (this.spawnTimer >= SIM_CONFIG.spawnIntervalSec) {
        this.spawnTimer = 0;
        this.trySpawn();
      }
    }

    for (const v of this.villagers) this.updateVillager(v, dt);
    this.updateFish(dt);
    for (const m of this.marine) this.updateMarine(m, dt);
    for (const s of this.ships) this.updateShip(s, dt);
  }

  private trySpawn(): void {
    const c = this.census;
    const wantV = targetVillagerCount(c, SIM_CONFIG.villagerPerGrassTile, SIM_CONFIG.maxVillagers) * this.densityMultipliers.villagers;
    const wantF = targetFishCount(c, SIM_CONFIG.fishPerDeepWaterTile, SIM_CONFIG.maxFish) * this.densityMultipliers.fish;
    const wantM = targetMarineCount(c, SIM_CONFIG.marinePerDeepWaterTile, SIM_CONFIG.maxLargeMarine) * this.densityMultipliers.whales;
    const wantS = targetShipCount(c, SIM_CONFIG.shipPerDeepWaterTile, SIM_CONFIG.maxShips) * this.densityMultipliers.ships;

    while (this.villagers.length < wantV) {
      if (!this.spawnVillager()) break;
    }
    while (this.fish.length < wantF) {
      if (!this.spawnFish()) break;
    }
    while (this.marine.length < wantM) {
      if (!this.spawnMarine()) break;
    }
    while (this.ships.length < wantS) {
      if (!this.spawnShip()) break;
    }
  }

  private spawnVillager(): boolean {
    const sample = pickWalkTarget(this.census, -1, 0);
    if (!sample) return false;
    const { x, y } = tileCenter(sample.tileX, sample.tileY);
    this.villagers.push({
      x, y,
      dir: 0,
      variant: Math.floor(Math.random() * 4),
      animPhase: Math.random() * 4,
      state: 'idle',
      pauseLeft: Math.random() * 2,
      targetX: x,
      targetY: y,
      landComponent: sample.component,
    });
    return true;
  }

  private spawnFish(): boolean {
    const shallow = Math.random() < 0.35 && this.census.shallowWaterSamples.length > 0;
    const pool = shallow ? this.census.shallowWaterSamples : this.census.deepWaterSamples;
    if (pool.length === 0) return false;
    const t = pool[Math.floor(Math.random() * pool.length)]!;
    const { x, y } = tileCenter(t.tileX, t.tileY);
    const angle = Math.random() * Math.PI * 2;
    this.fish.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * SIM_CONFIG.fishSpeed,
      vy: Math.sin(angle) * SIM_CONFIG.fishSpeed,
      hue: Math.random(),
      animPhase: Math.random() * 4,
      shallow,
    });
    return true;
  }

  private spawnMarine(): boolean {
    if (this.census.deepWaterSamples.length === 0) return false;
    const t = this.census.deepWaterSamples[Math.floor(Math.random() * this.census.deepWaterSamples.length)]!;
    const kinds = [EntityKind.Whale, EntityKind.Shark, EntityKind.Orca, EntityKind.Swordfish] as const;
    const kind = kinds[Math.floor(Math.random() * kinds.length)]!;
    const speed = kind === EntityKind.Whale ? SIM_CONFIG.whaleSpeed
      : kind === EntityKind.Swordfish ? SIM_CONFIG.sharkSpeed * 1.4
      : SIM_CONFIG.sharkSpeed;
    const { x, y } = tileCenter(t.tileX, t.tileY);
    this.marine.push({
      kind,
      x, y,
      angle: Math.random() * Math.PI * 2,
      speed,
      animPhase: Math.random() * 4,
      sprayCooldown: 2 + Math.random() * 5,
    });
    return true;
  }

  private spawnShip(): boolean {
    const useBoat = Math.random() < 0.45 && this.census.shallowWaterSamples.length > 0;
    if (useBoat) {
      const t = this.census.shallowWaterSamples[Math.floor(Math.random() * this.census.shallowWaterSamples.length)]!;
      const { x, y } = tileCenter(t.tileX, t.tileY);
      this.ships.push({
        kind: EntityKind.Rowboat,
        x, y,
        angle: Math.random() * Math.PI * 2,
        speed: SIM_CONFIG.boatSpeed,
        animPhase: 0,
        wakePhase: 0,
      });
      return true;
    }
    if (this.census.deepWaterSamples.length === 0) return false;
    const t = this.census.deepWaterSamples[Math.floor(Math.random() * this.census.deepWaterSamples.length)]!;
    const { x, y } = tileCenter(t.tileX, t.tileY);
    this.ships.push({
      kind: EntityKind.Galleon,
      x, y,
      angle: Math.random() * Math.PI * 2,
      speed: SIM_CONFIG.shipSpeed,
      animPhase: 0,
      wakePhase: 0,
    });
    return true;
  }

  private updateVillager(v: VillagerAgent, dt: number): void {
    const { tx, ty } = worldToTile(v.x, v.y);

    if (!isWalkableTile(this.tilemap, tx, ty)) {
      const rescue = findNearestWalkable(this.tilemap, tx, ty);
      if (!rescue) {
        const idx = this.villagers.indexOf(v);
        if (idx >= 0) this.villagers.splice(idx, 1);
        return;
      }
      const c = tileCenter(rescue.tileX, rescue.tileY);
      v.x = c.x;
      v.y = c.y;
      v.state = 'idle';
      v.pauseLeft = 0.5;
      return;
    }

    v.animPhase += dt * 8;

    if (v.state === 'idle') {
      v.pauseLeft -= dt;
      if (v.pauseLeft <= 0) {
        const target = pickWalkTarget(this.census, v.landComponent, 0.25);
        if (target) {
          const c = tileCenter(target.tileX, target.tileY);
          v.targetX = c.x;
          v.targetY = c.y;
          v.landComponent = target.component;
          v.state = 'walk';
        } else {
          v.pauseLeft = 1 + Math.random();
        }
      }
      return;
    }

    const dx = v.targetX - v.x;
    const dy = v.targetY - v.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) {
      v.state = 'idle';
      v.pauseLeft = 0.8 + Math.random() * 2.5;
      return;
    }

    const step = SIM_CONFIG.villagerSpeed * dt;
    const nx = dx / dist;
    const ny = dy / dist;
    const nextX = v.x + nx * step;
    const nextY = v.y + ny * step;
    const { tx: ntx, ty: nty } = worldToTile(nextX, nextY);

    if (isWalkableTile(this.tilemap, ntx, nty)) {
      v.x = nextX;
      v.y = nextY;
      v.dir = pickDirFromDelta(nx, ny);
    } else {
      v.state = 'idle';
      v.pauseLeft = 0.3;
    }
  }

  private updateFish(dt: number): void {
    const neighborR = 40;
    for (let i = this.fish.length - 1; i >= 0; i--) {
      const f = this.fish[i]!;
      const { tx, ty } = worldToTile(f.x, f.y);

      const inShallow = isShallowWaterTile(this.tilemap, this.coast, tx, ty);
      const inDeep = isDeepWaterTile(this.tilemap, this.coast, tx, ty);
      const inWater = isWaterTile(this.tilemap, tx, ty);

      if (!inWater) {
        const rescue = findNearestDeepWater(this.tilemap, this.coast, tx, ty, 80);
        if (!rescue) {
          this.fish.splice(i, 1);
          continue;
        }
        const c = tileCenter(rescue.tileX, rescue.tileY);
        f.x = c.x;
        f.y = c.y;
      }

      if (f.shallow && inDeep) {
        f.vx *= -0.5;
        f.vy *= -0.5;
      }
      if (!f.shallow && inShallow) {
        f.vx *= -0.8;
        f.vy *= -0.8;
      }

      let sepX = 0;
      let sepY = 0;
      let alignX = 0;
      let alignY = 0;
      let cohX = 0;
      let cohY = 0;
      let count = 0;

      for (let j = 0; j < this.fish.length; j++) {
        if (i === j) continue;
        const o = this.fish[j]!;
        const ddx = f.x - o.x;
        const ddy = f.y - o.y;
        const d = Math.hypot(ddx, ddy);
        if (d > neighborR || d < 0.001) continue;
        count++;
        if (d < 14) {
          sepX += ddx / d;
          sepY += ddy / d;
        }
        alignX += o.vx;
        alignY += o.vy;
        cohX += o.x;
        cohY += o.y;
      }

      if (count > 0) {
        alignX /= count;
        alignY /= count;
        cohX = cohX / count - f.x;
        cohY = cohY / count - f.y;
        f.vx += (sepX * 2 + (alignX - f.vx) * 0.05 + cohX * 0.02) * dt * 30;
        f.vy += (sepY * 2 + (alignY - f.vy) * 0.05 + cohY * 0.02) * dt * 30;
      }

      const spd = Math.hypot(f.vx, f.vy);
      const maxSpd = SIM_CONFIG.fishSpeed * (f.shallow ? 0.85 : 1.1);
      if (spd > maxSpd) {
        f.vx = (f.vx / spd) * maxSpd;
        f.vy = (f.vy / spd) * maxSpd;
      }

      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.animPhase += dt * 10;
    }
  }

  private updateMarine(m: MarineAgent, dt: number): void {
    const { tx, ty } = worldToTile(m.x, m.y);

    if (!isDeepWaterTile(this.tilemap, this.coast, tx, ty)) {
      const rescue = findNearestDeepWater(this.tilemap, this.coast, tx, ty);
      if (!rescue) {
        const idx = this.marine.indexOf(m);
        if (idx >= 0) this.marine.splice(idx, 1);
        return;
      }
      const c = tileCenter(rescue.tileX, rescue.tileY);
      m.x = c.x;
      m.y = c.y;
    }

    let steerX = 0;
    let steerY = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const ntx = tx + dx;
      const nty = ty + dy;
      if (!isDeepWaterTile(this.tilemap, this.coast, ntx, nty)) {
        steerX -= dx;
        steerY -= dy;
      }
    }

    m.angle += (Math.random() - 0.5) * dt * 0.6;
    const nextX = m.x + Math.cos(m.angle) * m.speed * dt + steerX * 2 * dt;
    const nextY = m.y + Math.sin(m.angle) * m.speed * dt + steerY * 2 * dt;
    const nextTile = worldToTile(nextX, nextY);

    // O empurrão de steerX/Y acima é só uma dica suave de direção; perto de
    // penínsulas/reentrâncias isso não bastava e o agente acabava entrando
    // em água rasa (achado na validação da Sprint 06 — ~360 violações em
    // 2 min simulados num teste de estresse). Este gate garante a regra
    // "nunca entra": só efetiva o passo se o tile de destino continuar em
    // água profunda; senão, gira mais forte para a próxima tentativa.
    if (isDeepWaterTile(this.tilemap, this.coast, nextTile.tx, nextTile.ty)) {
      m.x = nextX;
      m.y = nextY;
    } else if (steerX !== 0 || steerY !== 0) {
      m.angle = Math.atan2(steerY, steerX);
    }

    m.animPhase += dt * (m.kind === EntityKind.Whale ? 3 : 6);

    if (m.kind === EntityKind.Whale) {
      m.sprayCooldown -= dt;
      if (m.sprayCooldown <= 0) m.sprayCooldown = 4 + Math.random() * 6;
    }
  }

  private updateShip(s: ShipAgent, dt: number): void {
    const { tx, ty } = worldToTile(s.x, s.y);
    const isGalleon = s.kind === EntityKind.Galleon;

    if (isGalleon) {
      if (!isDeepWaterTile(this.tilemap, this.coast, tx, ty)) {
        let steerX = 0;
        let steerY = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ntx = tx + dx;
          const nty = ty + dy;
          if (!isDeepWaterTile(this.tilemap, this.coast, ntx, nty)) {
            steerX -= dx;
            steerY -= dy;
          }
        }
        if (steerX !== 0 || steerY !== 0) {
          s.angle = Math.atan2(steerY, steerX);
        } else {
          const rescue = findNearestDeepWater(this.tilemap, this.coast, tx, ty);
          if (rescue) {
            const c = tileCenter(rescue.tileX, rescue.tileY);
            s.angle = Math.atan2(c.y - s.y, c.x - s.x);
          }
        }
      } else {
        s.angle += (Math.random() - 0.5) * dt * 0.25;
      }
    } else {
      const ok = isShallowWaterTile(this.tilemap, this.coast, tx, ty)
        || isDeepWaterTile(this.tilemap, this.coast, tx, ty);
      if (!ok) {
        s.angle += Math.PI * 0.5;
      } else {
        s.angle += (Math.random() - 0.5) * dt * 0.4;
      }
    }

    const nextX = s.x + Math.cos(s.angle) * s.speed * dt;
    const nextY = s.y + Math.sin(s.angle) * s.speed * dt;
    const nextTile = worldToTile(nextX, nextY);
    const nextValid = isGalleon
      ? isDeepWaterTile(this.tilemap, this.coast, nextTile.tx, nextTile.ty)
      : isShallowWaterTile(this.tilemap, this.coast, nextTile.tx, nextTile.ty) ||
        isDeepWaterTile(this.tilemap, this.coast, nextTile.tx, nextTile.ty);

    // O ajuste de ângulo acima é só a dica de direção; perto de reentrâncias
    // isso não bastava e o navio acabava entrando em água rasa (galeão) ou
    // em terra (bote) — achado na validação da Sprint 06. Este gate garante
    // a regra "nunca cruza": só efetiva o passo se o tile de destino
    // continuar válido para este tipo de navio.
    if (nextValid) {
      s.x = nextX;
      s.y = nextY;
    } else {
      s.angle += Math.PI * 0.5;
    }

    s.animPhase += dt * (s.kind === EntityKind.Galleon ? 4 : 6);
    s.wakePhase += dt * 8;
  }
}
