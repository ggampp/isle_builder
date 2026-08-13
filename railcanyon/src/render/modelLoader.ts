import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { BuildingKind } from '../world/buildings.ts';

export type TrainKind = 'locomotive' | 'wagon';

/** Altura-alvo em metros (eixo Y) para normalizar cada asset ao footprint do jogo. */
const TARGET_HEIGHT: Partial<Record<BuildingKind, number>> = {
  cottage: 4.2,
  house: 5.2,
  manor: 7.4,
  cabin: 5.1,
  watertower: 8.3,
  windmill: 7.8,
  shed: 3.4,
  lamp: 4.0,
  bench: 1.4,
};

/** Comprimento-alvo no eixo do trilho (+X) para o trem caber no espaçamento dos carros. */
const TRAIN_FIT: Record<TrainKind, { length: number; height: number; yaw: number }> = {
  locomotive: { length: 5.4, height: 3.6, yaw: -Math.PI / 2 },
  wagon: { length: 4.8, height: 2.35, yaw: -Math.PI / 2 },
};

/** URLs públicas (Vite serve `public/` na raiz). */
const BUILDING_MODEL_URLS: Partial<Record<BuildingKind, string>> = {
  cottage: `${import.meta.env.BASE_URL}assets/models/cottage.glb`,
  house: `${import.meta.env.BASE_URL}assets/models/house.glb`,
  manor: `${import.meta.env.BASE_URL}assets/models/manor.glb`,
  cabin: `${import.meta.env.BASE_URL}assets/models/cabin.glb`,
  watertower: `${import.meta.env.BASE_URL}assets/models/watertower.glb`,
  windmill: `${import.meta.env.BASE_URL}assets/models/windmill.glb`,
  shed: `${import.meta.env.BASE_URL}assets/models/shed.glb`,
  lamp: `${import.meta.env.BASE_URL}assets/models/lamp.glb`,
  bench: `${import.meta.env.BASE_URL}assets/models/bench.glb`,
};

const TRAIN_MODEL_URLS: Record<TrainKind, string> = {
  locomotive: `${import.meta.env.BASE_URL}assets/models/locomotive.glb`,
  wagon: `${import.meta.env.BASE_URL}assets/models/wagon.glb`,
};

const buildingCache = new Map<BuildingKind, THREE.Object3D>();
const trainCache = new Map<TrainKind, THREE.Object3D>();
let preloadPromise: Promise<void> | null = null;

/**
 * Escala o modelo para a altura-alvo e assenta a base em y=0 (pivot no chão).
 * Mutates `root` in place.
 */
export function normalizeModelToHeight(root: THREE.Object3D, targetHeight: number): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y < 1e-4) return;

  const scale = targetHeight / size.y;
  root.scale.multiplyScalar(scale);
  seatOnGround(root);
}

function seatOnGround(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  root.position.y -= fitted.min.y;
  root.position.x -= (fitted.min.x + fitted.max.x) / 2;
  root.position.z -= (fitted.min.z + fitted.max.z) / 2;
}

function flattenMaterials(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (mat && 'flatShading' in mat) {
        (mat as THREE.MeshLambertMaterial).flatShading = true;
        mat.needsUpdate = true;
      }
    }
  });
}

function cloneMaterials(group: THREE.Group): void {
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) => m.clone());
    } else if (obj.material) {
      obj.material = obj.material.clone();
    }
  });
}

function fitTrain(root: THREE.Object3D, kind: TrainKind): void {
  const spec = TRAIN_FIT[kind];
  root.rotation.y += spec.yaw;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const length = Math.max(size.x, size.z);
  if (length < 1e-4) return;
  const byLength = spec.length / length;
  const byHeight = size.y > 1e-4 ? spec.height / size.y : byLength;
  root.scale.multiplyScalar(Math.min(byLength, byHeight));
  seatOnGround(root);

  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const fittedSize = new THREE.Vector3();
  fitted.getSize(fittedSize);
  if (kind === 'locomotive') {
    root.userData.smokeOffset = new THREE.Vector3(
      fittedSize.x * 0.22,
      fittedSize.y * 0.92,
      0,
    );
  }
}

function addWagonLoad(root: THREE.Group): void {
  if (root.getObjectByName('load')) return;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const load = new THREE.Mesh(
    new THREE.BoxGeometry(size.x * 0.72, 0.5, size.z * 0.58),
    new THREE.MeshLambertMaterial({ color: '#8a5a34', flatShading: true }),
  );
  load.name = 'load';
  load.visible = false;
  load.position.set(0, box.max.y + 0.22, 0);
  load.castShadow = true;
  root.add(load);
}

function prepareBuilding(scene: THREE.Object3D, kind: BuildingKind): THREE.Group {
  const root = new THREE.Group();
  root.name = `model:${kind}`;
  root.add(scene);

  const target = TARGET_HEIGHT[kind];
  if (target !== undefined) normalizeModelToHeight(root, target);
  flattenMaterials(root);

  root.traverse((obj) => {
    if (obj.name === 'blades' || obj.name === 'spin') obj.userData.spin = true;
  });

  return root;
}

function prepareTrain(scene: THREE.Object3D, kind: TrainKind): THREE.Group {
  const root = new THREE.Group();
  root.name = `model:${kind}`;
  root.add(scene);
  fitTrain(root, kind);
  flattenMaterials(root);
  if (kind === 'wagon') addWagonLoad(root);
  return root;
}

async function loadBuilding(kind: BuildingKind, url: string, loader: GLTFLoader): Promise<void> {
  try {
    const gltf = await loader.loadAsync(url);
    buildingCache.set(kind, prepareBuilding(gltf.scene, kind));
  } catch (err) {
    console.warn(`[modelLoader] falha ao carregar ${kind} (${url}); usando procedural.`, err);
  }
}

async function loadTrain(kind: TrainKind, url: string, loader: GLTFLoader): Promise<void> {
  try {
    const gltf = await loader.loadAsync(url);
    trainCache.set(kind, prepareTrain(gltf.scene, kind));
  } catch (err) {
    console.warn(`[modelLoader] falha ao carregar ${kind} (${url}); usando procedural.`, err);
  }
}

/** Pré-carrega construções e o trem. Idempotente. */
export function preloadBuildingModels(): Promise<void> {
  if (!preloadPromise) {
    const loader = new GLTFLoader();
    preloadPromise = Promise.all([
      ...(Object.entries(BUILDING_MODEL_URLS) as [BuildingKind, string][]).map(([kind, url]) =>
        loadBuilding(kind, url, loader),
      ),
      ...(Object.entries(TRAIN_MODEL_URLS) as [TrainKind, string][]).map(([kind, url]) =>
        loadTrain(kind, url, loader),
      ),
    ]).then(() => undefined);
  }
  return preloadPromise;
}

export function hasBuildingModel(kind: BuildingKind): boolean {
  return buildingCache.has(kind);
}

export function hasTrainModel(kind: TrainKind): boolean {
  return trainCache.has(kind);
}

/**
 * Clona um modelo pré-carregado (geometria compartilhada; materiais clonados
 * para o ghost poder trocá-los sem afetar outras instâncias).
 */
export function cloneBuildingModel(kind: BuildingKind): THREE.Group | null {
  const template = buildingCache.get(kind);
  if (!template) return null;

  const cloned = template.clone(true);
  const group = cloned instanceof THREE.Group ? cloned : new THREE.Group().add(cloned);
  cloneMaterials(group);
  return group;
}

export function cloneTrainModel(kind: TrainKind): THREE.Group | null {
  const template = trainCache.get(kind);
  if (!template) return null;

  const cloned = template.clone(true);
  const group = cloned instanceof THREE.Group ? cloned : new THREE.Group().add(cloned);
  cloneMaterials(group);
  if (template.userData.smokeOffset instanceof THREE.Vector3) {
    group.userData.smokeOffset = template.userData.smokeOffset.clone();
  }
  return group;
}

/** Só para testes — limpa o cache. */
export function _resetModelCacheForTests(): void {
  buildingCache.clear();
  trainCache.clear();
  preloadPromise = null;
}

/** Só para testes — injeta um template já preparado. */
export function _setBuildingModelForTests(kind: BuildingKind, root: THREE.Object3D): void {
  buildingCache.set(kind, root);
}

export function _setTrainModelForTests(kind: TrainKind, root: THREE.Object3D): void {
  trainCache.set(kind, root);
}
