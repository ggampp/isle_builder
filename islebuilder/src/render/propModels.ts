import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PROP_CATALOG } from '../props/catalog.ts';
import { propWorldSize } from './art/worldScale.ts';

const cache = new Map<string, THREE.Object3D>();
let preloadPromise: Promise<void> | null = null;

/**
 * Escala o modelo para a altura-alvo e assenta a base em y=0 (pivot no chão).
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

function prepareLoadedScene(scene: THREE.Object3D, propId: string): THREE.Group {
  const root = new THREE.Group();
  root.name = `prop:${propId}`;
  root.add(scene);

  const def = PROP_CATALOG.find((p) => p.id === propId);
  const target = def ? propWorldSize(def).h : 16;
  normalizeModelToHeight(root, target);

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

  return root;
}

async function loadOne(propId: string, url: string, loader: GLTFLoader): Promise<void> {
  try {
    const gltf = await loader.loadAsync(url);
    cache.set(propId, prepareLoadedScene(gltf.scene, propId));
  } catch {
    // Silencioso: fallback para billboard do atlas.
  }
}

/** Pré-carrega GLBs em `public/assets/models/props/{id}.glb`. */
export function preloadPropModels(ids?: string[]): Promise<void> {
  if (!preloadPromise) {
    const loader = new GLTFLoader();
    const list = ids ?? PROP_CATALOG.map((p) => p.id);
    const base = `${import.meta.env.BASE_URL}assets/models/props/`;
    preloadPromise = Promise.all(list.map((id) => loadOne(id, `${base}${id}.glb`, loader))).then(
      () => undefined,
    );
  }
  return preloadPromise;
}

export function hasPropModel(propId: string): boolean {
  return cache.has(propId);
}

export function clonePropModel(propId: string): THREE.Group | null {
  const template = cache.get(propId);
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

export function _resetPropModelCacheForTests(): void {
  cache.clear();
  preloadPromise = null;
}
