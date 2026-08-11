import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { BuildingKind } from '../world/buildings.ts';

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

const cache = new Map<BuildingKind, THREE.Object3D>();
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
  root.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(root);
  root.position.y -= fitted.min.y;
  root.position.x -= (fitted.min.x + fitted.max.x) / 2;
  root.position.z -= (fitted.min.z + fitted.max.z) / 2;
}

function prepareLoadedScene(scene: THREE.Object3D, kind: BuildingKind): THREE.Group {
  const root = new THREE.Group();
  root.name = `model:${kind}`;
  root.add(scene);

  const target = TARGET_HEIGHT[kind];
  if (target !== undefined) normalizeModelToHeight(root, target);

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      // Mantém o look flat do Canyon Rails mesmo se o GLB vier com Phong/Standard.
      if (mat && 'flatShading' in mat) {
        (mat as THREE.MeshLambertMaterial).flatShading = true;
        mat.needsUpdate = true;
      }
    }
  });

  // Pás do moinho: o GLB não preserva userData, então marcamos pelo nome.
  root.traverse((obj) => {
    if (obj.name === 'blades' || obj.name === 'spin') obj.userData.spin = true;
  });

  return root;
}

async function loadOne(kind: BuildingKind, url: string, loader: GLTFLoader): Promise<void> {
  try {
    const gltf = await loader.loadAsync(url);
    cache.set(kind, prepareLoadedScene(gltf.scene, kind));
  } catch (err) {
    console.warn(`[modelLoader] falha ao carregar ${kind} (${url}); usando procedural.`, err);
  }
}

/** Pré-carrega os GLBs conhecidos. Idempotente — chamadas paralelas compartilham a mesma Promise. */
export function preloadBuildingModels(): Promise<void> {
  if (!preloadPromise) {
    const loader = new GLTFLoader();
    preloadPromise = Promise.all(
      (Object.entries(BUILDING_MODEL_URLS) as [BuildingKind, string][]).map(([kind, url]) =>
        loadOne(kind, url, loader),
      ),
    ).then(() => undefined);
  }
  return preloadPromise;
}

export function hasBuildingModel(kind: BuildingKind): boolean {
  return cache.has(kind);
}

/**
 * Clona um modelo pré-carregado (geometria compartilhada; materiais clonados
 * para o ghost poder trocá-los sem afetar outras instâncias).
 */
export function cloneBuildingModel(kind: BuildingKind): THREE.Group | null {
  const template = cache.get(kind);
  if (!template) return null;

  const cloned = template.clone(true);
  const group = cloned instanceof THREE.Group ? cloned : new THREE.Group().add(cloned);
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) => m.clone());
    } else if (obj.material) {
      obj.material = obj.material.clone();
    }
  });
  return group;
}

/** Só para testes — limpa o cache. */
export function _resetModelCacheForTests(): void {
  cache.clear();
  preloadPromise = null;
}

/** Só para testes — injeta um template já preparado. */
export function _setBuildingModelForTests(kind: BuildingKind, root: THREE.Object3D): void {
  cache.set(kind, root);
}
