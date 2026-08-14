import * as THREE from 'three';
import { GameLoop } from '../core/loop.ts';
import { InputManager } from '../core/input.ts';
import { CanyonCamera } from '../core/camera.ts';
import { buildTerrain, buildWater } from '../world/terrain.ts';
import { buildScatter } from '../world/scatter.ts';
import type { RockField } from '../world/scatter.ts';
import { heightAt, slopeAt, WATER_LEVEL } from '../world/heightfield.ts';
import { raycastGround } from '../world/raycast.ts';
import { TOWNS, CONNECT_RADIUS, buildTowns, buildTownLabels, townById } from '../world/towns.ts';
import { setActiveWorld } from '../world/activeWorld.ts';
import { BUILDING_SPECS, createBuilding, makeGhost } from '../world/buildings.ts';
import type { BuildingKind } from '../world/buildings.ts';
import { RailNetwork, closestOnPath } from '../rail/network.ts';
import type { TrackPath } from '../rail/network.ts';
import { PIECE_SPECS } from '../rail/geometry.ts';
import type { PieceKind } from '../rail/geometry.ts';
import {
  buildTrackMesh, buildPiecePreview, createRailheadMarker,
  createJunctionMarker, createBlastPreview, disposeGroup,
} from '../rail/trackview.ts';
import { Train } from '../rail/train.ts';
import type { TrainStop } from '../rail/train.ts';
import { Economy } from './economy.ts';
import { ContractBoard } from './contracts.ts';
import { ObjectiveTracker } from './objectives.ts';
import type { ObjectiveProgress } from './objectives.ts';
import { readSave, writeSave } from './save.ts';
import type { SavedBuilding } from './save.ts';
import { GameAudio } from '../audio/audio.ts';
import { Hud } from '../ui/hud.ts';
import type { Selection } from '../ui/hud.ts';

const STARTING_COINS = 5960;
const REPAIR_BASE_COST = 98;
const WAGON_COST = 1250;
const LOCOMOTIVE_COST = 4500;
const BLAST_COST = 120;
export const BLAST_RADIUS = 9;
/** Moedas por unidade de carga entregue num contrato. */
const COINS_PER_UNIT = 7;
/** Folga entre o trilho e uma pedra para a peça ser aceita. */
const ROCK_CLEARANCE = 2.4;

interface PlacedBuilding {
  kind: BuildingKind;
  x: number;
  z: number;
  rot: number;
  group: THREE.Group;
}

interface TrainSlot {
  train: Train;
  lineId: number;
}

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: CanyonCamera;
  private input: InputManager;
  private hud: Hud;
  private audio = new GameAudio();

  private mapId: string;
  private lineOrigin: { x: number; z: number; heading: number };
  private network: RailNetwork;
  private rocks: RockField;
  private trackGroup = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private junctionGroup = new THREE.Group();
  private railheadMarker = createRailheadMarker();
  private blastPreview = createBlastPreview(BLAST_RADIUS);
  private trains: TrainSlot[] = [];
  private activeTrain = 0;
  private buildings: PlacedBuilding[] = [];
  private buildingsGroup = new THREE.Group();
  private spinners: THREE.Object3D[] = [];

  private economy = new Economy(STARTING_COINS);
  private contracts: ContractBoard;
  private objectives = new ObjectiveTracker();
  private progress: ObjectiveProgress = {
    piecesPlaced: 0,
    connectedTowns: [],
    contractsAccepted: 0,
    contractsCompleted: 0,
    buildingsPlaced: 0,
  };

  private selection: Selection = null;
  private ghostRotation = 0;
  private ghostSpot: { x: number; z: number; valid: boolean } | null = null;
  private connectedTowns: string[] = [];
  private following = false;
  private hudTimer = 0;
  private windmillIncomeTimer = 0;
  private elapsed = 0;

  constructor(container: HTMLElement, mapId: string) {
    const world = setActiveWorld(mapId);
    this.mapId = world.id;
    this.lineOrigin = { ...world.lineOrigin };
    this.network = new RailNetwork(this.lineOrigin);
    this.contracts = new ContractBoard(hashString(world.id));

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.rocks = this.setupScene();
    this.camera = new CanyonCamera(window.innerWidth / window.innerHeight);
    this.camera.focusOn(world.cameraFocus.x, world.cameraFocus.z, world.cameraFocus.distance);
    this.input = new InputManager(this.renderer.domElement);
    this.hud = new Hud(document.body, {
      onSelect: (selection) => this.onSelect(selection),
      onUndo: () => this.undoPiece(),
      onAddWagon: () => this.buyWagon(),
      onRepair: () => this.repairTrain(),
      onBuyLocomotive: () => this.buyLocomotive(),
      onAcceptContract: (id) => this.acceptContract(id),
      onSave: () => this.save(),
      onToggleFollow: () => { this.following = !this.following; },
      onToggleMute: () => this.toggleMute(),
      onCycleLine: () => this.cycleLine(),
      onCycleTrain: () => this.cycleTrain(),
      onHelp: () => this.showHelp(),
    });

    this.economy.onLevelUp = (level) => {
      this.hud.toast(`Nível ${level}! Novos contratos disponíveis.`);
      this.contracts.refreshOffers(this.connectedTowns, level);
      this.audio.coins();
    };

    this.trains.push({ train: new Train(), lineId: 0 });
    this.scene.add(this.trains[0].train.group);

    this.loadOrSeed();
    this.rebuildTrack();

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.resize(window.innerWidth / window.innerHeight);
    });
    const unlock = (): void => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    new GameLoop((dt) => this.update(dt)).start();
    this.hud.toast(world.welcome);
  }

  private setupScene(): RockField {
    this.scene.background = new THREE.Color('#f2c48f');
    this.scene.fog = new THREE.Fog('#f2c48f', 280, 580);

    this.scene.add(new THREE.HemisphereLight('#fff4e0', '#c98a5a', 0.85));
    const sun = new THREE.DirectionalLight('#fff1d6', 1.6);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -240;
    sun.shadow.camera.right = 240;
    sun.shadow.camera.top = 240;
    sun.shadow.camera.bottom = -240;
    sun.shadow.camera.far = 600;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    this.scene.add(buildTerrain());
    this.scene.add(buildWater());

    const towns = buildTowns();
    this.scene.add(towns.group);
    this.spinners.push(...towns.spinners);
    this.scene.add(buildTownLabels().group);

    const scatter = buildScatter(TOWNS.map((t) => ({ x: t.x, z: t.z, r: 24 })));
    this.scene.add(scatter.group);

    this.scene.add(this.trackGroup);
    this.scene.add(this.ghostGroup);
    this.scene.add(this.junctionGroup);
    this.scene.add(this.buildingsGroup);
    this.scene.add(this.railheadMarker);
    this.blastPreview.visible = false;
    this.scene.add(this.blastPreview);
    return scatter.rocks;
  }

  // ── Estado inicial e persistência ──────────────────────────────────

  private loadOrSeed(): void {
    const save = readSave(this.mapId);
    if (save && save.lines.some((line) => line.kinds.length > 0)) {
      this.rocks.restoreRemoved(save.blastedRocks);
      this.network.restore(save.lines);
      this.economy.restore(save.coins, save.score, save.xp);
      for (const b of save.buildings) this.spawnBuilding(b.kind, b.x, b.z, b.rot);
      save.trains.forEach((saved, index) => {
        if (index > 0) this.addTrain(saved.lineId);
        const slot = this.trains[index];
        if (!slot) return;
        slot.lineId = this.network.line(saved.lineId) ? saved.lineId : 0;
        slot.train.setWagons(saved.wagons);
        slot.train.condition = saved.condition;
      });
      this.progress.piecesPlaced = this.network.count;
      this.progress.buildingsPlaced = save.buildings.length;
      this.applyBuildingPerks();
      this.hud.toast('Partida anterior carregada.');
      return;
    }

    // Trecho inicial pronto saindo da estação, sem pedras no caminho.
    this.rocks.blast(this.lineOrigin.x, this.lineOrigin.z, 32);
    for (const kind of ['straight', 'straight', 'straight'] as PieceKind[]) {
      this.network.place(kind);
    }
  }

  private save(): void {
    const ok = writeSave({
      version: 2,
      mapId: this.mapId,
      lines: this.network.serialize(),
      buildings: this.buildings.map((b): SavedBuilding => ({
        kind: b.kind, x: b.x, z: b.z, rot: b.rot,
      })),
      trains: this.trains.map((slot) => ({
        lineId: slot.lineId,
        wagons: slot.train.wagons,
        condition: slot.train.condition,
      })),
      blastedRocks: this.rocks.removedIndices(),
      coins: this.economy.coins,
      score: this.economy.score,
      xp: this.economy.xp,
    }, this.mapId);
    this.hud.toast(ok ? 'Jogo salvo neste navegador.' : 'Não foi possível salvar aqui.');
  }

  private showHelp(): void {
    this.hud.toast('Trilhos saem da ponta brilhante. Espaço repete, Z desfaz, L troca de linha.');
  }

  private toggleMute(): void {
    this.audio.unlock();
    this.audio.setMuted(!this.audio.muted);
    this.hud.setMuted(this.audio.muted);
    this.hud.toast(this.audio.muted ? 'Som desligado.' : 'Som ligado.');
  }

  // ── Seleção e prévias ──────────────────────────────────────────────

  private onSelect(selection: Selection): void {
    this.selection = selection;
    this.ghostRotation = 0;
    this.clearGhost();
    this.blastPreview.visible = false;
    if (selection?.type === 'track') {
      this.camera.focusOn(this.network.railhead.x, this.network.railhead.z);
    }
    if (selection?.type === 'tool' && selection.kind === 'siding') {
      this.hud.toast('Clique num trecho da linha para nascer um desvio ali.');
    }
  }

  private clearGhost(): void {
    for (const child of [...this.ghostGroup.children]) {
      this.ghostGroup.remove(child);
      disposeGroup(child);
    }
    this.ghostSpot = null;
  }

  private obstacleCheck = (x: number, z: number): boolean =>
    this.rocks.blocks(x, z, ROCK_CLEARANCE);

  private updateGhost(): void {
    this.clearGhost();
    this.blastPreview.visible = false;
    if (!this.selection) return;

    if (this.selection.type === 'track') {
      const check = this.network.canPlace(this.selection.kind, this.obstacleCheck);
      const affordable = this.economy.canAfford(PIECE_SPECS[this.selection.kind].cost);
      const closing = check.ok && check.closesLoop === true;
      const valid = check.ok && affordable;
      const origin = this.network.activeLine.origin;
      this.ghostGroup.add(buildPiecePreview(
        this.network.railhead,
        this.selection.kind,
        valid,
        closing ? origin : undefined,
      ));
      if (closing) {
        const ring = createRailheadMarker();
        (ring.material as THREE.MeshBasicMaterial).color.set('#7ee0ff');
        ring.position.set(origin.x, heightAt(origin.x, origin.z) + 1.2, origin.z);
        this.ghostGroup.add(ring);
      }
      this.ghostSpot = { x: 0, z: 0, valid };
      return;
    }

    const spot = this.cursorGround();
    if (!spot) return;

    if (this.selection.type === 'tool') {
      if (this.selection.kind === 'dynamite') {
        const hasTarget = this.rocks.blocks(spot.x, spot.z, BLAST_RADIUS)
          || this.buildingNear(spot.x, spot.z) !== null;
        this.blastPreview.position.set(spot.x, heightAt(spot.x, spot.z) + 0.4, spot.z);
        (this.blastPreview.material as THREE.MeshBasicMaterial).color.set(
          hasTarget && this.economy.canAfford(BLAST_COST) ? '#7bf06a' : '#f2564a');
        this.blastPreview.visible = true;
        this.ghostSpot = { x: spot.x, z: spot.z, valid: hasTarget };
        return;
      }
      const near = this.network.nearestPose(spot.x, spot.z);
      const valid = near !== null && near.distance < 6 && near.poseIndex >= 1;
      const marker = createJunctionMarker();
      const at = near && valid
        ? this.network.posesFor(near.lineId)[near.poseIndex]
        : { x: spot.x, z: spot.z };
      marker.position.set(at.x, heightAt(at.x, at.z) + 1.6, at.z);
      makeGhost(marker as unknown as THREE.Group, valid);
      this.ghostGroup.add(marker);
      this.ghostSpot = { x: spot.x, z: spot.z, valid };
      return;
    }

    const valid = this.canPlaceBuilding(this.selection.kind, spot.x, spot.z);
    const ghost = createBuilding(this.selection.kind);
    makeGhost(ghost, valid);
    ghost.position.set(spot.x, heightAt(spot.x, spot.z) - 0.15, spot.z);
    ghost.rotation.y = this.ghostRotation;
    this.ghostGroup.add(ghost);
    this.ghostSpot = { x: spot.x, z: spot.z, valid };
  }

  private cursorGround(): { x: number; z: number } | null {
    const ndc = new THREE.Vector2(
      (this.input.pointerX / window.innerWidth) * 2 - 1,
      -(this.input.pointerY / window.innerHeight) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera.camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    return raycastGround(o.x, o.y, o.z, d.x, d.y, d.z);
  }

  private buildingNear(x: number, z: number): PlacedBuilding | null {
    for (const b of this.buildings) {
      if (Math.hypot(b.x - x, b.z - z) < BLAST_RADIUS) return b;
    }
    return null;
  }

  private canPlaceBuilding(kind: BuildingKind, x: number, z: number): boolean {
    const spec = BUILDING_SPECS[kind];
    if (Math.abs(x) > 205 || Math.abs(z) > 205) return false;
    if (heightAt(x, z) < WATER_LEVEL + 1.2) return false;
    if (slopeAt(x, z) > 0.34) return false;
    if (!this.economy.canAfford(spec.cost)) return false;
    if (this.rocks.blocks(x, z, spec.footprint)) return false;
    for (const b of this.buildings) {
      const min = spec.footprint + BUILDING_SPECS[b.kind].footprint;
      if (Math.hypot(b.x - x, b.z - z) < min) return false;
    }
    for (const line of this.network.list()) {
      const path = this.network.path(line.id);
      if (path.points.length < 2) continue;
      if (closestOnPath(path, x, z).distance < spec.footprint + 3) return false;
    }
    return true;
  }

  // ── Ações do jogador ───────────────────────────────────────────────

  private placeSelected(): void {
    if (!this.selection) return;
    if (this.selection.type === 'track') {
      this.placeTrack(this.selection.kind);
      return;
    }
    if (this.selection.type === 'tool') {
      if (this.selection.kind === 'dynamite') this.detonate();
      else this.createSiding();
      return;
    }

    const spot = this.ghostSpot;
    if (!spot) return;
    const kind = this.selection.kind;
    const spec = BUILDING_SPECS[kind];
    if (!spot.valid) {
      this.audio.error();
      this.hud.toast(this.economy.canAfford(spec.cost)
        ? 'Não dá para construir aqui.'
        : `Faltam moedas: ${spec.label} custa ${spec.cost}.`);
      return;
    }
    if (!this.economy.spend(spec.cost)) return;
    this.spawnBuilding(kind, spot.x, spot.z, this.ghostRotation);
    this.economy.earn(0, spec.score, spec.xp);
    this.progress.buildingsPlaced++;
    this.applyBuildingPerks();
    this.audio.click(520);
    this.hud.toast(`${spec.label} construída — ${spec.perk}`);
  }

  private detonate(): void {
    const spot = this.ghostSpot;
    if (!spot) return;
    if (!this.economy.canAfford(BLAST_COST)) {
      this.audio.error();
      this.hud.toast(`A dinamite custa ${BLAST_COST} moedas.`);
      return;
    }
    const building = this.buildingNear(spot.x, spot.z);
    const removedRocks = this.rocks.blast(spot.x, spot.z, BLAST_RADIUS);
    if (removedRocks === 0 && !building) {
      this.audio.error();
      this.hud.toast('Nada para explodir aqui.');
      return;
    }
    this.economy.spend(BLAST_COST);
    this.audio.boom();

    if (building) {
      const spec = BUILDING_SPECS[building.kind];
      this.buildingsGroup.remove(building.group);
      disposeGroup(building.group);
      this.buildings = this.buildings.filter((b) => b !== building);
      this.progress.buildingsPlaced = Math.max(0, this.progress.buildingsPlaced - 1);
      this.economy.earn(Math.round(spec.cost * 0.6));
      this.applyBuildingPerks();
      this.hud.toast(`${spec.label} desmontada — 60% do custo devolvido.`);
      return;
    }
    this.economy.earn(0, removedRocks * 4, removedRocks * 5);
    this.hud.toast(`${removedRocks} pedra(s) explodida(s) — caminho livre.`);
  }

  private createSiding(): void {
    const spot = this.ghostSpot;
    if (!spot || !spot.valid) {
      this.audio.error();
      this.hud.toast('Clique mais perto de um trecho de linha já construído.');
      return;
    }
    const near = this.network.nearestPose(spot.x, spot.z);
    if (!near) return;
    const id = this.network.addBranch(near.lineId, near.poseIndex);
    if (id === null) {
      this.hud.toast('Não dá para derivar um desvio nesse ponto.');
      return;
    }
    this.rebuildTrack();
    this.audio.click(760);
    this.hud.toast(`${this.network.lineName(id)} criado — agora estenda-o com trilhos.`);
    this.hud.setSelection({ type: 'track', kind: 'straight' });
    this.selection = { type: 'track', kind: 'straight' };
  }

  private spawnBuilding(kind: BuildingKind, x: number, z: number, rot: number): void {
    const group = createBuilding(kind, this.buildings.length);
    group.position.set(x, heightAt(x, z) - 0.15, z);
    group.rotation.y = rot;
    group.traverse((obj) => {
      if (obj.userData.spin) this.spinners.push(obj);
    });
    this.buildingsGroup.add(group);
    this.buildings.push({ kind, x, z, rot, group });
    this.applyBuildingPerks();
  }

  /** Recalcula os bônus que as construções dão aos trens. */
  private applyBuildingPerks(): void {
    let cargoBonus = 0;
    let logsBonus = 0;
    let wear = 1;
    for (const b of this.buildings) {
      switch (b.kind) {
        case 'house': case 'cottage': case 'manor': cargoBonus += 2; break;
        case 'shed': cargoBonus += 8; break;
        case 'cabin': logsBonus += 6; break;
        case 'watertower': wear *= 0.8; break;
        default: break;
      }
    }
    for (const { train } of this.trains) {
      train.cargoCapacity = 14 * train.wagons + cargoBonus;
      train.logsMax = 56 + logsBonus;
      train.wearFactor = wear;
    }
  }

  private placeTrack(kind: PieceKind): void {
    const spec = PIECE_SPECS[kind];
    if (!this.economy.canAfford(spec.cost)) {
      this.audio.error();
      this.hud.toast(`Faltam moedas: a peça custa ${spec.cost}.`);
      return;
    }
    const result = this.network.place(kind, this.obstacleCheck);
    if (!result.ok) {
      this.audio.error();
      this.hud.toast(result.reason);
      return;
    }
    this.economy.spend(spec.cost);
    this.economy.earn(0, 8, 12);
    this.progress.piecesPlaced++;
    this.audio.click();
    this.rebuildTrack();
    if (result.closesLoop) {
      this.hud.toast('Circuito fechado — o trem agora dá a volta.');
    }
    if (this.selection?.type === 'track') {
      this.camera.focusOn(this.network.railhead.x, this.network.railhead.z);
    }
  }

  private undoPiece(): void {
    const { kind, reason } = this.network.undo();
    if (!kind) {
      this.audio.error();
      this.hud.toast(reason);
      return;
    }
    this.economy.earn(Math.round(PIECE_SPECS[kind].cost * 0.7));
    this.progress.piecesPlaced = Math.max(0, this.progress.piecesPlaced - 1);
    this.rebuildTrack();
    this.hud.toast('Peça removida — 70% do custo devolvido.');
  }

  private cycleLine(): void {
    if (this.network.lineCount < 2) {
      this.hud.toast('Use a agulha 🔀 para criar um desvio primeiro.');
      return;
    }
    const id = this.network.cycleActiveLine();
    this.rebuildTrack();
    this.camera.focusOn(this.network.railhead.x, this.network.railhead.z);
    this.hud.toast(`Construindo em: ${this.network.lineName(id)}`);
  }

  private cycleTrain(): void {
    if (this.trains.length < 2) {
      this.hud.toast('Compre outra locomotiva na Loja para ter um segundo trem.');
      return;
    }
    this.activeTrain = (this.activeTrain + 1) % this.trains.length;
    const slot = this.trains[this.activeTrain];
    this.hud.toast(`Trem ${this.activeTrain + 1} — ${this.network.lineName(slot.lineId)}`);
  }

  private rebuildTrack(): void {
    for (const child of [...this.trackGroup.children]) {
      this.trackGroup.remove(child);
      disposeGroup(child);
    }
    for (const child of [...this.junctionGroup.children]) {
      this.junctionGroup.remove(child);
      disposeGroup(child);
    }

    const connected = new Set<string>();
    for (const line of this.network.list()) {
      const path = this.network.path(line.id);
      // Um desvio herda o trecho da linha-mãe; desenhar só a parte própria.
      const from = line.anchor ? line.anchor.poseIndex : 0;
      const own: TrackPath = {
        points: path.points.slice(from),
        distances: path.distances.slice(from).map((d) => d - path.distances[from]),
        totalLength: path.totalLength - path.distances[from],
        closed: line.closed,
      };
      if (own.points.length > 1) this.trackGroup.add(buildTrackMesh(own));

      if (line.anchor) {
        const at = path.points[line.anchor.poseIndex];
        const marker = createJunctionMarker();
        marker.position.set(at.x, at.y + 1.1, at.z);
        this.junctionGroup.add(marker);
      }
      for (const town of TOWNS) {
        if (closestOnPath(path, town.x, town.z).distance <= CONNECT_RADIUS) connected.add(town.id);
      }
    }

    const head = this.network.railhead;
    this.railheadMarker.position.set(head.x, heightAt(head.x, head.z) + 1.2, head.z);

    this.connectedTowns = TOWNS.filter((t) => connected.has(t.id)).map((t) => t.id);
    this.progress.connectedTowns = this.connectedTowns;

    for (const slot of this.trains) {
      const path = this.network.path(slot.lineId);
      slot.train.setPath(path, this.computeStops(path));
    }

    this.contracts.refreshOffers(this.connectedTowns, this.economy.level);
    this.hud.minimap.setLines(this.network.list().map((line) => this.network.path(line.id).points));
    this.hud.minimap.setConnected(this.connectedTowns);
  }

  private computeStops(path: TrackPath): TrainStop[] {
    const stops: TrainStop[] = [];
    for (const town of TOWNS) {
      const near = closestOnPath(path, town.x, town.z);
      if (near.distance <= CONNECT_RADIUS) stops.push({ townId: town.id, s: near.s });
    }
    return stops;
  }

  // ── Economia ───────────────────────────────────────────────────────

  private get current(): TrainSlot {
    return this.trains[this.activeTrain];
  }

  private buyWagon(): void {
    const { train } = this.current;
    if (train.wagons >= 8) {
      this.hud.toast('A locomotiva não puxa mais que 8 vagões.');
      return;
    }
    if (!this.economy.spend(WAGON_COST)) {
      this.audio.error();
      this.hud.toast('Moedas insuficientes para um vagão.');
      return;
    }
    train.setWagons(train.wagons + 1);
    this.applyBuildingPerks();
    this.audio.click(440);
    this.hud.toast(`Vagão engatado — ${train.wagons} no total.`);
  }

  private buyLocomotive(): void {
    if (this.trains.length >= this.network.lineCount) {
      this.hud.toast('Cada linha já tem seu trem — crie um desvio antes.');
      return;
    }
    if (!this.economy.spend(LOCOMOTIVE_COST)) {
      this.audio.error();
      this.hud.toast('Moedas insuficientes para outra locomotiva.');
      return;
    }
    const taken = new Set(this.trains.map((s) => s.lineId));
    const free = this.network.list().find((line) => !taken.has(line.id));
    this.addTrain(free ? free.id : 0);
    this.activeTrain = this.trains.length - 1;
    this.applyBuildingPerks();
    this.rebuildTrack();
    this.audio.coins();
    this.hud.toast(`Locomotiva comprada para ${this.network.lineName(this.current.lineId)}.`);
  }

  private addTrain(lineId: number): void {
    const train = new Train();
    this.scene.add(train.group);
    this.trains.push({ train, lineId });
  }

  private repairCostFor(train: Train): number {
    return Math.max(0, Math.round((100 - train.condition) * REPAIR_BASE_COST / 20));
  }

  private repairTrain(): void {
    const { train } = this.current;
    if (train.condition >= 99.5) {
      this.hud.toast('O trem já está em ótimo estado.');
      return;
    }
    const cost = this.repairCostFor(train);
    if (!this.economy.spend(cost)) {
      this.audio.error();
      this.hud.toast('Moedas insuficientes para o reparo.');
      return;
    }
    train.condition = 100;
    this.audio.click(600);
    this.hud.toast('Trem revisado — condição em 100%.');
  }

  private acceptContract(id: string): void {
    const contract = this.contracts.accept(id);
    if (!contract) {
      this.hud.toast('Limite de 3 contratos simultâneos.');
      return;
    }
    this.progress.contractsAccepted++;
    this.audio.click(700);
    this.hud.toast(`Contrato aceito: ${this.contracts.describe(contract)}`);
  }

  private onTrainArrive(train: Train, townId: string): void {
    const town = townById(townId);
    if (!town) return;
    this.audio.whistle();

    const { used, completed } = this.contracts.deliver(townId, train.cargo);
    if (used > 0) {
      train.cargo -= used;
      this.economy.earn(used * COINS_PER_UNIT, used * 2, used * 3);
      this.hud.toast(`${Math.round(used)} de carga entregue em ${town.name}.`);
    } else {
      // Sem contrato pendente, a parada ainda rende passageiros e correio.
      this.economy.earn(12 * train.wagons, 6, 8);
    }
    for (const contract of completed) {
      this.economy.earn(contract.reward, contract.score, contract.xp);
      this.progress.contractsCompleted++;
      this.audio.coins();
      this.hud.toast(`Contrato concluído! +${contract.reward.toLocaleString('pt-BR')} moedas`);
    }
    train.cargo = train.cargoCapacity;
    train.refreshCargoVisual();
    this.contracts.refreshOffers(this.connectedTowns, this.economy.level);
  }

  // ── Loop ───────────────────────────────────────────────────────────

  private update(dt: number): void {
    this.elapsed += dt;

    if (this.following) {
      const head = this.current.train.headPosition;
      this.camera.focusOn(head.x, head.z);
    }
    this.camera.update(dt, this.input);
    // A prévia é recalculada antes de tratar o clique: assim um clique logo
    // após mover o cursor usa a posição atual, não a do frame anterior.
    this.updateGhost();

    for (const key of this.input.consumePressedKeys()) {
      if (key === 'Space') this.placeSelected();
      if (key === 'KeyZ') this.undoPiece();
      if (key === 'KeyL') this.cycleLine();
      if (key === 'Escape') {
        this.selection = null;
        this.hud.setSelection(null);
        this.clearGhost();
      }
      if (key === 'BracketLeft') this.ghostRotation -= Math.PI / 8;
      if (key === 'BracketRight') this.ghostRotation += Math.PI / 8;
    }
    if (this.input.consumeClick()) this.placeSelected();

    for (const slot of this.trains) {
      for (const event of slot.train.update(dt)) {
        if (event.type === 'arrive') this.onTrainArrive(slot.train, event.townId);
        if (event.type === 'outOfFuel') {
          this.hud.toast('Sem lenha — o trem segue devagar até a próxima estação.');
        }
      }
    }
    const lead = this.current.train;
    this.audio.updateTrain(dt, lead.currentSpeed, lead.cruiseSpeed);
    this.audio.setWind(this.camera.camera.position.y / 220);

    for (const expired of this.contracts.tick(dt)) {
      this.hud.toast(`Contrato expirado: ${expired.resource} para ${expired.townName}.`);
    }

    this.windmillIncomeTimer -= dt;
    if (this.windmillIncomeTimer <= 0) {
      this.windmillIncomeTimer = 60;
      const mills = this.buildings.filter((b) => b.kind === 'windmill').length;
      if (mills > 0) this.economy.earn(mills * 8, mills * 2, 0);
    }

    for (const spinner of this.spinners) spinner.rotation.z += dt * 0.9;
    this.railheadMarker.visible = this.network.count > 0 && !this.network.activeLine.closed;
    this.railheadMarker.scale.setScalar(1 + Math.sin(this.elapsed * 3) * 0.12);

    this.updateGhost();

    const completed = this.objectives.check(this.progress);
    if (completed) {
      this.economy.earn(completed.reward, completed.reward * 0.2, completed.xp);
      this.audio.coins();
      this.hud.toast(`Objetivo concluído: ${completed.title} (+${completed.reward} moedas)`);
    }

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.2;
      this.refreshHud();
    }

    this.renderer.render(this.scene, this.camera.camera);
  }

  private refreshHud(): void {
    const objective = this.objectives.current;
    const { train, lineId } = this.current;
    const stops = this.computeStops(this.network.path(lineId));
    const route = stops.length > 0
      ? stops.map((s) => townById(s.townId)?.name ?? s.townId).join(' — ')
      : 'Linha sem estações';

    this.hud.update({
      economy: this.economy.snapshot(),
      train: {
        name: this.trains.length > 1 ? `${train.name} · ${this.activeTrain + 1}` : train.name,
        speedMph: train.speedMph,
        logs: train.logs,
        logsMax: train.logsMax,
        condition: train.condition,
        wagons: train.wagons,
        cargo: train.cargo,
        cargoCapacity: train.cargoCapacity,
        status: train.statusLabel,
        route: `${this.network.lineName(lineId)}: ${route}`,
        repairCost: this.repairCostFor(train),
        wagonCost: WAGON_COST,
        locomotiveCost: LOCOMOTIVE_COST,
        count: this.trains.length,
      },
      objective: {
        title: objective?.title ?? 'Vale conectado!',
        detail: objective?.detail ?? 'Siga expandindo a rede e cumprindo contratos.',
        progress: this.objectives.fraction(this.progress),
        reward: objective?.reward ?? 0,
      },
      contracts: { offers: this.contracts.offers, accepted: this.contracts.accepted },
      connectedTowns: this.connectedTowns,
      trackPieces: this.network.count,
      activeLineName: this.network.lineName(this.network.activeLineId),
      lineCount: this.network.lineCount,
      following: this.following,
      blastCost: BLAST_COST,
    });
    this.hud.minimap.update(this.trains.map((slot) => slot.train.headPosition));
  }
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
