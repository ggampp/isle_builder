import * as THREE from 'three';
import { cloneTrainModel } from '../render/modelLoader.ts';
import { sampleAt, wrapLength } from './network.ts';
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

function crossedOnLoop(
  before: number,
  after: number,
  stopS: number,
  length: number,
  direction: number,
): boolean {
  if (length <= 0) return false;
  const b = wrapLength(before, length);
  const a = wrapLength(after, length);
  const s = wrapLength(stopS, length);
  if (direction > 0) {
    if (a >= b) return b < s && a >= s;
    return b < s || a >= s;
  }
  if (a <= b) return b > s && a <= s;
  return b > s || a <= s;
}

const CAR_FORWARD = new THREE.Vector3(1, 0, 0);
const _tangent = new THREE.Vector3();
const _align = new THREE.Quaternion();

/** Mesma orientação das dormentes: +X local segue a tangente do trilho. */
export function alignCarToTangent(
  car: THREE.Object3D,
  tangent: { x: number; y: number; z: number },
  reverse: boolean,
): void {
  _tangent.set(tangent.x, tangent.y, tangent.z);
  if (_tangent.lengthSq() < 1e-8) _tangent.set(1, 0, 0);
  else _tangent.normalize();
  _align.setFromUnitVectors(CAR_FORWARD, _tangent);
  car.quaternion.copy(_align);
  if (reverse) car.rotateY(Math.PI);
}

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
  const tire = new THREE.CylinderGeometry(0.52, 0.52, 0.28, 14);
  tire.rotateX(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.22, 0.22, 0.32, 10);
  hub.rotateX(Math.PI / 2);
  const tireMat = lambert('#1e1e24');
  const hubMat = lambert('#6a6a72');
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? 0 : -spread / 2 + (spread * i) / (count - 1);
    for (const side of [-0.88, 0.88]) {
      const wheel = new THREE.Mesh(tire, tireMat);
      wheel.position.set(x, 0.52, side);
      wheel.castShadow = true;
      parent.add(wheel);
      const center = new THREE.Mesh(hub, hubMat);
      center.position.set(x, 0.52, side);
      parent.add(center);
    }
  }
}

function buildLocomotive(): THREE.Group {
  const g = new THREE.Group();
  // chassis
  g.add(box(5.0, 0.35, 2.0, '#1d3a6e', 0, 0.85));
  // caldeira
  const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.85, 3.4, 14), lambert('#2f66c4'));
  boiler.rotation.z = Math.PI / 2;
  boiler.position.set(0.55, 1.85, 0);
  boiler.castShadow = true;
  g.add(boiler);
  // anéis da caldeira
  for (const x of [-0.4, 0.6, 1.6]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.05, 6, 16), lambert('#1d3a6e'));
    ring.rotation.y = Math.PI / 2;
    ring.position.set(x, 1.85, 0);
    g.add(ring);
  }
  // cabine
  g.add(box(2.0, 2.35, 2.15, '#274f96', -1.85, 2.05));
  g.add(box(2.15, 0.35, 2.35, '#1d3a6e', -1.85, 3.35));
  g.add(box(0.7, 0.55, 0.08, '#8fc6e8', -1.85, 2.5, 1.12));
  g.add(box(0.08, 0.55, 0.7, '#8fc6e8', -2.9, 2.5, 0));
  // chaminé + sino
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 1.25, 12), lambert('#22232b'));
  chimney.position.set(1.75, 2.85, 0);
  chimney.castShadow = true;
  g.add(chimney);
  g.add(box(0.55, 0.12, 0.55, '#3a3a42', 1.75, 3.5));
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), lambert('#e0a33c'));
  bell.position.set(0.9, 2.75, 0);
  g.add(bell);
  // farol
  g.add(box(0.35, 0.35, 0.35, '#f5d98a', 2.55, 2.15));
  // cowcatcher
  g.add(box(0.9, 0.55, 1.7, '#8a2f27', 2.85, 0.85));
  g.add(box(0.55, 0.35, 1.9, '#6a2420', 3.15, 0.55));
  // tanque de água / tender detail
  g.add(box(1.1, 0.9, 1.6, '#e0a33c', 2.35, 1.35));
  addWheels(g, 4, 3.8);
  return g;
}

function buildWagon(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(4.7, 0.35, 2.0, '#5c4632', 0, 0.95));
  g.add(box(4.7, 1.15, 2.0, '#3a3a42', 0, 1.7));
  // ripas laterais
  for (const z of [-1.05, 1.05]) {
    for (let i = 0; i < 5; i++) {
      g.add(box(0.12, 1.0, 0.08, '#6b4a2f', -1.8 + i * 0.9, 1.75, z));
    }
  }
  g.add(box(4.5, 0.1, 0.1, '#8a5a34', 0, 2.35, -1.05));
  g.add(box(4.5, 0.1, 0.1, '#8a5a34', 0, 2.35, 1.05));
  const load = box(3.9, 0.55, 1.5, '#8a5a34', 0, 2.45);
  load.visible = false;
  load.name = 'load';
  g.add(load);
  addWheels(g, 2, 3.1);
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

  /** Velocidade instantânea em m/s (usada pelo áudio). */
  get currentSpeed(): number {
    return this.speed;
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
    if (this.path.closed) return 'Dando a volta no circuito';
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
    if (path.closed) {
      this.s = wrapLength(this.s, path.totalLength);
      this.direction = 1;
    }
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

      const length = this.path.totalLength;
      const loop = this.path.closed;

      for (const stop of this.stops) {
        const crossed = loop
          ? crossedOnLoop(before, this.s, stop.s, length, this.direction)
          : this.direction > 0
            ? before < stop.s && this.s >= stop.s
            : before > stop.s && this.s <= stop.s;
        if (crossed) {
          this.s = loop ? wrapLength(stop.s, length) : stop.s;
          this.dwellTimer = DWELL_SECONDS;
          this.lastTownId = stop.townId;
          this.logs = this.logsMax;
          events.push({ type: 'arrive', townId: stop.townId });
          break;
        }
      }

      if (loop) {
        this.s = wrapLength(this.s, length);
      } else if (this.s >= length) {
        this.s = length;
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
    this.cars = [cloneTrainModel('locomotive') ?? buildLocomotive()];
    for (let i = 0; i < this.wagons; i++) this.cars.push(cloneTrainModel('wagon') ?? buildWagon());
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
    const length = this.path.totalLength;
    for (let i = 0; i < this.cars.length; i++) {
      const offset = i * CAR_SPACING * this.direction;
      const raw = this.s - offset;
      const s = this.path.closed
        ? wrapLength(raw, length)
        : Math.min(Math.max(raw, 0), length);
      const { position, tangent } = sampleAt(this.path, s);
      const car = this.cars[i];
      car.position.set(position.x, position.y, position.z);
      alignCarToTangent(car, tangent, this.direction < 0);
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
      const offset = loco.userData.smokeOffset instanceof THREE.Vector3
        ? loco.userData.smokeOffset
        : new THREE.Vector3(1.6, 3.4, 0);
      puff.position.copy(offset).applyQuaternion(loco.quaternion).add(loco.position);
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
