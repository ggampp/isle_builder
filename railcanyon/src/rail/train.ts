import * as THREE from 'three';
import { sampleAt } from './network.ts';
import type { TrackPath } from './network.ts';

const CAR_SPACING = 6.6;
const SMOKE_POOL = 40;
const DWELL_SECONDS = 2.6;
/** Lenha gasta por metro percorrido. */
const FUEL_PER_METER = 0.02;
/** Condição perdida (em pontos percentuais) por metro percorrido. */
const WEAR_PER_METER = 0.0016;

export interface TrainStop {
  townId: string;
  s: number;
}

export type TrainEvent =
  | { type: 'arrive'; townId: string }
  | { type: 'endOfLine' }
  | { type: 'outOfFuel' };

function lambert(color: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

function box(w: number, h: number, d: number, color: string, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function addWheels(parent: THREE.Group, count: number, spread: number): void {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10);
  geo.rotateX(Math.PI / 2);
  const mat = lambert('#2b2b33');
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1);
    for (const side of [-0.85, 0.85]) {
      const wheel = new THREE.Mesh(geo, mat);
      wheel.position.set(x, 0.5, side);
      parent.add(wheel);
    }
  }
}

function buildLocomotive(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(4.6, 1.5, 1.9, '#2f66c4', 0, 1.5));
  g.add(box(1.9, 2.3, 2.1, '#274f96', -1.8, 2.0));
  g.add(box(2.1, 0.5, 2.3, '#1d3a6e', -1.8, 3.25));
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 1.1, 8), lambert('#22232b'));
  chimney.position.set(1.6, 2.7, 0);
  chimney.castShadow = true;
  g.add(chimney);
  g.add(box(0.9, 0.7, 1.4, '#e0a33c', 2.5, 1.2));
  g.add(box(0.7, 0.6, 2.0, '#8a2f27', 2.9, 0.7));
  addWheels(g, 3, 3.4);
  return g;
}

function buildWagon(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(4.6, 0.4, 1.9, '#6b4a2f', 0, 1.0));
  g.add(box(4.6, 1.1, 1.9, '#3a3a42', 0, 1.75));
  const load = box(3.8, 0.5, 1.4, '#8a5a34', 0, 2.4);
  load.visible = false;
  load.name = 'load';
  g.add(load);
  addWheels(g, 2, 3.0);
  return g;
}

/**
 * O trem percorre o caminho da rede por comprimento de arco: a posição é sempre
 * uma função de `s`, então ele nunca sai do trilho (lição do Isle Builder: não
 * confiar em integração livre para garantias do tipo "nunca").
 */
export class Train {
  readonly group = new THREE.Group();
  readonly name = 'Workhorse 1915';
  wagons = 4;
  logs = 56;
  logsMax = 56;
  condition = 95;
  cargo = 0;
  cargoCapacity = 56;
  wearFactor = 1;
  /** Velocidade de cruzeiro em m/s (20 ≈ 45 mph, como no vídeo). */
  cruiseSpeed = 20;

  private path: TrackPath | null = null;
  private stops: TrainStop[] = [];
  private cars: THREE.Group[] = [];
  private smoke: THREE.Mesh[] = [];
  private smokeAge: number[] = [];
  private smokeTimer = 0;
  private s = 0;
  private direction = 1;
  private speed = 0;
  private dwellTimer = 0;
  private lastTownId: string | null = null;

  constructor() {
    this.rebuildCars();
    const smokeGeo = new THREE.IcosahedronGeometry(0.55, 0);
    for (let i = 0; i < SMOKE_POOL; i++) {
      const puff = new THREE.Mesh(smokeGeo, new THREE.MeshLambertMaterial({
        color: '#f4f0ea', transparent: true, opacity: 0, depthWrite: false,
      }));
      puff.visible = false;
      this.smoke.push(puff);
      this.smokeAge.push(Infinity);
      this.group.add(puff);
    }
  }

  get speedMph(): number {
    return Math.round(this.speed * 2.237);
  }

  get isMoving(): boolean {
    return this.speed > 0.5;
  }

  get headPosition(): THREE.Vector3 {
    return this.cars[0].position;
  }

  get progress(): number {
    return this.s;
  }

  get statusLabel(): string {
    if (!this.path || this.path.totalLength < 12) return 'Sem linha construída';
    if (this.dwellTimer > 0) {
      return this.lastTownId ? 'Parado na estação' : 'Fim da linha — construa mais trilhos';
    }
    if (this.logs <= 0) return 'Sem lenha — seguindo devagar';
    return 'Circulando pelo desfiladeiro';
  }

  setWagons(count: number): void {
    this.wagons = count;
    this.rebuildCars();
  }

  setPath(path: TrackPath, stops: TrainStop[]): void {
    this.path = path;
    this.stops = stops.slice().sort((a, b) => a.s - b.s);
    this.s = Math.min(this.s, path.totalLength);
  }

  /** Reposiciona o trem no início da linha (usado ao carregar um jogo salvo). */
  reset(): void {
    this.s = 0;
    this.direction = 1;
    this.speed = 0;
    this.dwellTimer = 0;
    this.lastTownId = null;
  }

  update(dt: number): TrainEvent[] {
    const events: TrainEvent[] = [];
    if (!this.path || this.path.totalLength < 12) {
      this.speed = 0;
      this.layoutCars();
      this.updateSmoke(dt, false);
      return events;
    }

    if (this.dwellTimer > 0) {
      this.dwellTimer -= dt;
      this.speed = 0;
    } else {
      const target = this.logs > 0 ? this.cruiseSpeed : this.cruiseSpeed * 0.4;
      this.speed += (target - this.speed) * Math.min(1, dt * 0.9);

      const before = this.s;
      const travelled = this.speed * dt;
      this.s += travelled * this.direction;

      if (this.logs > 0) {
        this.logs = Math.max(0, this.logs - travelled * FUEL_PER_METER);
        if (this.logs === 0) events.push({ type: 'outOfFuel' });
      }
      this.condition = Math.max(0, this.condition - travelled * WEAR_PER_METER * this.wearFactor);

      for (const stop of this.stops) {
        const crossed = this.direction > 0
          ? before < stop.s && this.s >= stop.s
          : before > stop.s && this.s <= stop.s;
        if (crossed) {
          this.s = stop.s;
          this.dwellTimer = DWELL_SECONDS;
          this.lastTownId = stop.townId;
          this.logs = this.logsMax;
          events.push({ type: 'arrive', townId: stop.townId });
          break;
        }
      }

      if (this.s >= this.path.totalLength) {
        this.s = this.path.totalLength;
        this.direction = -1;
        this.dwellTimer = DWELL_SECONDS;
        this.lastTownId = null;
        events.push({ type: 'endOfLine' });
      } else if (this.s <= 0) {
        this.s = 0;
        this.direction = 1;
        this.dwellTimer = DWELL_SECONDS;
        this.lastTownId = null;
        events.push({ type: 'endOfLine' });
      }
    }

    this.layoutCars();
    this.updateSmoke(dt, this.isMoving || this.dwellTimer > 0);
    return events;
  }

  private rebuildCars(): void {
    for (const car of this.cars) this.group.remove(car);
    this.cars = [buildLocomotive()];
    for (let i = 0; i < this.wagons; i++) this.cars.push(buildWagon());
    for (const car of this.cars) this.group.add(car);
    this.cargoCapacity = 14 * this.wagons;
  }

  /** Mostra a carga nos vagões quando o trem está carregado. */
  refreshCargoVisual(): void {
    const filled = this.cargoCapacity > 0 ? this.cargo / this.cargoCapacity : 0;
    for (let i = 1; i < this.cars.length; i++) {
      const load = this.cars[i].getObjectByName('load');
      if (load) load.visible = filled > (i - 1) / Math.max(1, this.wagons);
    }
  }

  private layoutCars(): void {
    if (!this.path) return;
    for (let i = 0; i < this.cars.length; i++) {
      const offset = i * CAR_SPACING * this.direction;
      const s = Math.min(Math.max(this.s - offset, 0), this.path.totalLength);
      const { position, tangent } = sampleAt(this.path, s);
      const car = this.cars[i];
      car.position.set(position.x, position.y, position.z);
      const yaw = Math.atan2(tangent.x, tangent.z) - Math.PI / 2;
      car.rotation.set(0, this.direction > 0 ? yaw : yaw + Math.PI, 0);
      car.rotation.z = -Math.asin(Math.max(-1, Math.min(1, tangent.y))) * this.direction;
    }
  }

  private updateSmoke(dt: number, emitting: boolean): void {
    this.smokeTimer -= dt;
    if (emitting && this.smokeTimer <= 0) {
      this.smokeTimer = this.isMoving ? 0.13 : 0.5;
      let slot = this.smokeAge.indexOf(Infinity);
      if (slot < 0) slot = 0;
      const loco = this.cars[0];
      const puff = this.smoke[slot];
      puff.position.copy(new THREE.Vector3(1.6, 3.4, 0)
        .applyEuler(loco.rotation).add(loco.position));
      puff.scale.setScalar(0.6);
      puff.visible = true;
      this.smokeAge[slot] = 0;
    }
    for (let i = 0; i < this.smoke.length; i++) {
      if (this.smokeAge[i] === Infinity) continue;
      this.smokeAge[i] += dt;
      const life = 2.2;
      if (this.smokeAge[i] >= life) {
        this.smoke[i].visible = false;
        this.smokeAge[i] = Infinity;
        continue;
      }
      const t = this.smokeAge[i] / life;
      const puff = this.smoke[i];
      puff.position.y += dt * (2.4 - t * 1.6);
      puff.position.x += dt * 0.4;
      puff.scale.setScalar(0.6 + t * 2.4);
      (puff.material as THREE.MeshLambertMaterial).opacity = 0.85 * (1 - t) * (1 - t);
    }
  }
}
