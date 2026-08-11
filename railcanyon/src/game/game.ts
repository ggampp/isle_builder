import * as THREE from 'three';
import { GameLoop } from '../core/loop.ts';
import { InputManager } from '../core/input.ts';
import { CanyonCamera } from '../core/camera.ts';
import { buildTerrain, buildWater } from '../world/terrain.ts';
import { buildScatter } from '../world/scatter.ts';
import { heightAt, slopeAt, WATER_LEVEL } from '../world/heightfield.ts';
import { raycastGround } from '../world/raycast.ts';
import { TOWNS, CONNECT_RADIUS, buildTowns, buildTownLabels, townById } from '../world/towns.ts';
import { BUILDING_SPECS, createBuilding, makeGhost } from '../world/buildings.ts';
import type { BuildingKind } from '../world/buildings.ts';
import { RailNetwork, closestOnPath } from '../rail/network.ts';
import type { TrackPath } from '../rail/network.ts';
import { PIECE_SPECS } from '../rail/geometry.ts';
import type { PieceKind } from '../rail/geometry.ts';
import { buildTrackMesh, buildPiecePreview, createRailheadMarker, disposeGroup } from '../rail/trackview.ts';
import { Train } from '../rail/train.ts';
import type { TrainStop } from '../rail/train.ts';
import { Economy } from './economy.ts';
import { ContractBoard } from './contracts.ts';
import { ObjectiveTracker } from './objectives.ts';
import type { ObjectiveProgress } from './objectives.ts';
import { readSave, writeSave } from './save.ts';
import type { SavedBuilding } from './save.ts';
import { Hud } from '../ui/hud.ts';
import type { Selection } from '../ui/hud.ts';

const STARTING_COINS = 5960;
const REPAIR_BASE_COST = 98;
const WAGON_COST = 1250;
/** Moedas por unidade de carga entregue num contrato. */
const COINS_PER_UNIT = 7;

interface PlacedBuilding {
  kind: BuildingKind;
  x: number;
  z: number;
  rot: number;
  group: THREE.Group;
}

/** Ponto e direção iniciais da linha, saindo de Pine Hollow rumo a leste. */
const LINE_ORIGIN = { x: TOWNS[0].x + 8, z: TOWNS[0].z + 2, heading: -0.16 };

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: CanyonCamera;
  private input: InputManager;
  private hud: Hud;

  private network = new RailNetwork(LINE_ORIGIN);
  private trackGroup = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private railheadMarker = createRailheadMarker();
  private train = new Train();
  private buildings: PlacedBuilding[] = [];
  private buildingsGroup = new THREE.Group();
  private spinners: THREE.Object3D[] = [];

  private economy = new Economy(STARTING_COINS);
  private contracts = new ContractBoard();
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

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.setupScene();
    this.camera = new CanyonCamera(window.innerWidth / window.innerHeight);
    this.camera.focusOn(TOWNS[0].x + 30, TOWNS[0].z + 10, 130);
    this.input = new InputManager(this.renderer.domElement);
    this.hud = new Hud(document.body, {
      onSelect: (selection) => this.onSelect(selection),
      onUndo: () => this.undoPiece(),
      onAddWagon: () => this.buyWagon(),
      onRepair: () => this.repairTrain(),
      onAcceptContract: (id) => this.acceptContract(id),
      onSave: () => this.save(),
      onToggleFollow: () => { this.following = !this.following; },
      onHelp: () => this.showHelp(),
    });

    this.economy.onLevelUp = (level) => {
      this.hud.toast(`Nível ${level}! Novos contratos disponíveis.`);
      this.contracts.refreshOffers(this.connectedTowns, level);
    };

    this.loadOrSeed();
    this.rebuildTrack();

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.resize(window.innerWidth / window.innerHeight);
    });

    new GameLoop((dt) => this.update(dt)).start();
    this.hud.toast('Bem-vindo a Canyon Rails — estenda a linha e conecte o vale.');
  }

  private setupScene(): void {
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

    this.scene.add(buildScatter(
      TOWNS.map((t) => new THREE.Vector3(t.x, 0, t.z)),
      TOWNS.map((t) => ({ x: t.x, z: t.z, r: 24 })),
    ));

    this.scene.add(this.trackGroup);
    this.scene.add(this.ghostGroup);
    this.scene.add(this.buildingsGroup);
    this.scene.add(this.train.group);
    this.scene.add(this.railheadMarker);
  }

  // ── Estado inicial e persistência ──────────────────────────────────

  private loadOrSeed(): void {
    const save = readSave();
    if (save && save.track.length > 0) {
      this.network.restore(save.track);
      this.economy.restore(save.coins, save.score, save.xp);
      this.train.setWagons(save.wagons);
      this.train.condition = save.condition;
      for (const b of save.buildings) this.spawnBuilding(b.kind, b.x, b.z, b.rot);
      this.progress.piecesPlaced = save.track.length;
      this.progress.buildingsPlaced = save.buildings.length;
      // Objetivos já cumpridos são pulados na primeira checagem.
      this.hud.toast('Partida anterior carregada.');
      return;
    }
    // Trecho inicial pronto saindo da estação de Pine Hollow.
    for (const kind of ['straight', 'straight', 'straight'] as PieceKind[]) {
      this.network.place(kind);
    }
  }

  private save(): void {
    const ok = writeSave({
      version: 1,
      track: this.network.kinds(),
      buildings: this.buildings.map((b): SavedBuilding => ({
        kind: b.kind, x: b.x, z: b.z, rot: b.rot,
      })),
      coins: this.economy.coins,
      score: this.economy.score,
      xp: this.economy.xp,
      wagons: this.train.wagons,
      condition: this.train.condition,
    });
    this.hud.toast(ok ? 'Jogo salvo neste navegador.' : 'Não foi possível salvar aqui.');
  }

  private showHelp(): void {
    this.hud.toast('Trilhos saem sempre da ponta brilhante. Espaço repete a peça, Z desfaz.');
  }

  // ── Construção ─────────────────────────────────────────────────────

  private onSelect(selection: Selection): void {
    this.selection = selection;
    this.ghostRotation = 0;
    this.clearGhost();
    if (selection?.type === 'track') {
      this.camera.focusOn(this.network.railhead.x, this.network.railhead.z);
    }
  }

  private clearGhost(): void {
    for (const child of [...this.ghostGroup.children]) {
      this.ghostGroup.remove(child);
      disposeGroup(child);
    }
    this.ghostSpot = null;
  }

  private updateGhost(): void {
    this.clearGhost();
    if (!this.selection) return;

    if (this.selection.type === 'track') {
      const check = this.network.canPlace(this.selection.kind);
      const affordable = this.economy.canAfford(PIECE_SPECS[this.selection.kind].cost);
      const valid = check.ok && affordable;
      this.ghostGroup.add(buildPiecePreview(this.network.railhead, this.selection.kind, valid));
      this.ghostSpot = { x: 0, z: 0, valid };
      return;
    }

    const spot = this.cursorGround();
    if (!spot) return;
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

  private canPlaceBuilding(kind: BuildingKind, x: number, z: number): boolean {
    const spec = BUILDING_SPECS[kind];
    if (Math.abs(x) > 205 || Math.abs(z) > 205) return false;
    if (heightAt(x, z) < WATER_LEVEL + 1.2) return false;
    if (slopeAt(x, z) > 0.34) return false;
    if (!this.economy.canAfford(spec.cost)) return false;
    for (const b of this.buildings) {
      const min = spec.footprint + BUILDING_SPECS[b.kind].footprint;
      if (Math.hypot(b.x - x, b.z - z) < min) return false;
    }
    const path = this.network.path();
    if (path.points.length > 1) {
      const near = closestOnPath(path, x, z);
      if (near.distance < spec.footprint + 3) return false;
    }
    return true;
  }

  private placeSelected(): void {
    if (!this.selection) return;
    if (this.selection.type === 'track') {
      this.placeTrack(this.selection.kind);
      return;
    }
    const spot = this.ghostSpot;
    if (!spot) return;
    const kind = this.selection.kind;
    const spec = BUILDING_SPECS[kind];
    if (!spot.valid) {
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
    this.hud.toast(`${spec.label} construída — ${spec.perk}`);
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

  /** Recalcula os bônus que as construções dão ao trem. */
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
    this.train.cargoCapacity = 14 * this.train.wagons + cargoBonus;
    this.train.logsMax = 56 + logsBonus;
    this.train.wearFactor = wear;
  }

  private placeTrack(kind: PieceKind): void {
    const spec = PIECE_SPECS[kind];
    if (!this.economy.canAfford(spec.cost)) {
      this.hud.toast(`Faltam moedas: a peça custa ${spec.cost}.`);
      return;
    }
    const result = this.network.place(kind);
    if (!result.ok) {
      this.hud.toast(result.reason);
      return;
    }
    this.economy.spend(spec.cost);
    this.economy.earn(0, 8, 12);
    this.progress.piecesPlaced++;
    this.rebuildTrack();
    if (this.selection?.type === 'track') {
      this.camera.focusOn(this.network.railhead.x, this.network.railhead.z);
    }
  }

  private undoPiece(): void {
    const removed = this.network.undo();
    if (!removed) {
      this.hud.toast('Não há peças para desfazer.');
      return;
    }
    this.economy.earn(Math.round(PIECE_SPECS[removed].cost * 0.7));
    this.progress.piecesPlaced = Math.max(0, this.progress.piecesPlaced - 1);
    this.rebuildTrack();
    this.hud.toast('Peça removida — 70% do custo devolvido.');
  }

  private rebuildTrack(): void {
    for (const child of [...this.trackGroup.children]) {
      this.trackGroup.remove(child);
      disposeGroup(child);
    }
    const path = this.network.path();
    this.trackGroup.add(buildTrackMesh(path));

    const head = this.network.railhead;
    this.railheadMarker.position.set(head.x, heightAt(head.x, head.z) + 1.2, head.z);

    this.connectedTowns = this.computeConnectedTowns(path);
    this.train.setPath(path, this.computeStops(path));
    this.contracts.refreshOffers(this.connectedTowns, this.economy.level);
    this.hud.minimap.setTrack(path.points);
    this.hud.minimap.setConnected(this.connectedTowns);
    this.progress.connectedTowns = this.connectedTowns;
  }

  private computeConnectedTowns(path: TrackPath): string[] {
    if (path.points.length < 2) return [];
    return TOWNS.filter((t) => closestOnPath(path, t.x, t.z).distance <= CONNECT_RADIUS)
      .map((t) => t.id);
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

  private buyWagon(): void {
    if (this.train.wagons >= 8) {
      this.hud.toast('A locomotiva não puxa mais que 8 vagões.');
      return;
    }
    if (!this.economy.spend(WAGON_COST)) {
      this.hud.toast('Moedas insuficientes para um vagão.');
      return;
    }
    this.train.setWagons(this.train.wagons + 1);
    this.applyBuildingPerks();
    this.hud.toast(`Vagão engatado — ${this.train.wagons} no total.`);
  }

  private get repairCost(): number {
    return Math.max(0, Math.round((100 - this.train.condition) * REPAIR_BASE_COST / 20));
  }

  private repairTrain(): void {
    if (this.train.condition >= 99.5) {
      this.hud.toast('O trem já está em ótimo estado.');
      return;
    }
    const cost = this.repairCost;
    if (!this.economy.spend(cost)) {
      this.hud.toast('Moedas insuficientes para o reparo.');
      return;
    }
    this.train.condition = 100;
    this.hud.toast('Trem revisado — condição em 100%.');
  }

  private acceptContract(id: string): void {
    const contract = this.contracts.accept(id);
    if (!contract) {
      this.hud.toast('Limite de 3 contratos simultâneos.');
      return;
    }
    this.progress.contractsAccepted++;
    this.hud.toast(`Contrato aceito: ${this.contracts.describe(contract)}`);
  }

  private onTrainArrive(townId: string): void {
    const town = townById(townId);
    if (!town) return;

    const { used, completed } = this.contracts.deliver(townId, this.train.cargo);
    if (used > 0) {
      this.train.cargo -= used;
      this.economy.earn(used * COINS_PER_UNIT, used * 2, used * 3);
      this.hud.toast(`${Math.round(used)} de carga entregue em ${town.name}.`);
    } else {
      // Sem contrato pendente, a parada ainda rende passageiros e correio.
      this.economy.earn(12 * this.train.wagons, 6, 8);
    }
    for (const contract of completed) {
      this.economy.earn(contract.reward, contract.score, contract.xp);
      this.progress.contractsCompleted++;
      this.hud.toast(`Contrato concluído! +${contract.reward.toLocaleString('pt-BR')} moedas`);
    }
    this.train.cargo = this.train.cargoCapacity;
    this.train.refreshCargoVisual();
    this.contracts.refreshOffers(this.connectedTowns, this.economy.level);
  }

  // ── Loop ───────────────────────────────────────────────────────────

  private update(dt: number): void {
    this.elapsed += dt;

    for (const key of this.input.consumePressedKeys()) {
      if (key === 'Space') this.placeSelected();
      if (key === 'KeyZ') this.undoPiece();
      if (key === 'Escape') {
        this.selection = null;
        this.hud.setSelection(null);
        this.clearGhost();
      }
      if (key === 'BracketLeft') this.ghostRotation -= Math.PI / 8;
      if (key === 'BracketRight') this.ghostRotation += Math.PI / 8;
    }
    if (this.input.consumeClick()) this.placeSelected();

    if (this.following) {
      const head = this.train.headPosition;
      this.camera.focusOn(head.x, head.z);
    }
    this.camera.update(dt, this.input);

    for (const event of this.train.update(dt)) {
      if (event.type === 'arrive') this.onTrainArrive(event.townId);
      if (event.type === 'outOfFuel') this.hud.toast('Sem lenha — o trem segue devagar até a próxima estação.');
    }

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
    this.railheadMarker.visible = this.network.count > 0;
    this.railheadMarker.scale.setScalar(1 + Math.sin(this.elapsed * 3) * 0.12);

    this.updateGhost();

    const completed = this.objectives.check(this.progress);
    if (completed) {
      this.economy.earn(completed.reward, completed.reward * 0.2, completed.xp);
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
    const route = this.connectedTowns.length > 0
      ? this.connectedTowns.map((id) => townById(id)?.name ?? id).join(' — ')
      : 'Linha sem estações';
    this.hud.update({
      economy: this.economy.snapshot(),
      train: {
        name: this.train.name,
        speedMph: this.train.speedMph,
        logs: this.train.logs,
        logsMax: this.train.logsMax,
        condition: this.train.condition,
        wagons: this.train.wagons,
        cargo: this.train.cargo,
        cargoCapacity: this.train.cargoCapacity,
        status: this.train.statusLabel,
        route,
        repairCost: this.repairCost,
        wagonCost: WAGON_COST,
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
      following: this.following,
    });
    this.hud.minimap.update(this.train.headPosition);
  }
}
