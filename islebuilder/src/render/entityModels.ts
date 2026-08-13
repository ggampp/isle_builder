import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { entitySpriteSize, type EntitySpriteKind } from './art/worldScale.ts';

export type EntityModelId = 'villager' | 'fish' | 'whale' | 'shark' | 'orca' | 'swordfish';

const MODEL_TO_SIZE: Record<EntityModelId, EntitySpriteKind> = {
  villager: 'villager',
  fish: 'fish',
  whale: 'whale',
  shark: 'shark',
  orca: 'orca',
  swordfish: 'swordfish',
};

/** Geometria pronta para InstancedMesh (vertex colors + pivot no chão). */
const geoCache = new Map<EntityModelId, THREE.BufferGeometry>();
let preloadPromise: Promise<void> | null = null;

function materialColor(mat: THREE.Material | THREE.Material[]): THREE.Color {
  const m = Array.isArray(mat) ? mat[0] : mat;
  if (m && 'color' in m && (m as THREE.MeshStandardMaterial).color instanceof THREE.Color) {
    return (m as THREE.MeshStandardMaterial).color.clone();
  }
  return new THREE.Color(0xffffff);
}

/**
 * Escala pelo eixo dominante e assenta y=0 / centro XZ.
 * Villager → altura; animais → comprimento (maior entre X/Z).
 */
export function normalizeEntityModel(root: THREE.Object3D, id: EntityModelId): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y < 1e-4 && size.x < 1e-4 && size.z < 1e-4) return;

  const target = entitySpriteSize(MODEL_TO_SIZE[id]);
  let scale: number;
  if (id === 'villager') {
    scale = target.h / Math.max(size.y, 1e-4);
  } else {
    const length = Math.max(size.z, size.x);
    scale = target.w / Math.max(length, 1e-4);
  }
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(root);
  root.position.y -= fitted.min.y;
  root.position.x -= (fitted.min.x + fitted.max.x) / 2;
  root.position.z -= (fitted.min.z + fitted.max.z) / 2;
}

/** Funde meshes do GLB numa geometria com vertex colors (local space após normalize). */
export function mergeEntityToGeometry(root: THREE.Object3D): THREE.BufferGeometry | null {
  root.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const src = obj.geometry;
    if (!src.getAttribute('position')) return;

    const geo = src.clone();
    geo.applyMatrix4(obj.matrixWorld);

    const col = materialColor(obj.material);
    const count = geo.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    // Drop UVs/normals extras that may block merge
    if (geo.getAttribute('uv')) geo.deleteAttribute('uv');
    if (geo.getAttribute('uv1')) geo.deleteAttribute('uv1');
    if (geo.getAttribute('normal')) geo.deleteAttribute('normal');
    parts.push(geo);
  });

  if (parts.length === 0) return null;
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) return null;
  merged.computeVertexNormals();
  return merged;
}

async function loadOne(id: EntityModelId, url: string, loader: GLTFLoader): Promise<void> {
  try {
    const gltf = await loader.loadAsync(url);
    const root = new THREE.Group();
    root.add(gltf.scene);
    normalizeEntityModel(root, id);
    const geo = mergeEntityToGeometry(root);
    if (geo) geoCache.set(id, geo);
  } catch {
    // fallback: atlas billboard
  }
}

export function preloadEntityModels(ids?: EntityModelId[]): Promise<void> {
  if (!preloadPromise) {
    const loader = new GLTFLoader();
    const list: EntityModelId[] = ids ?? [
      'villager',
      'fish',
      'whale',
      'shark',
      'orca',
      'swordfish',
    ];
    const base = `${import.meta.env.BASE_URL}assets/models/entities/`;
    preloadPromise = Promise.all(list.map((id) => loadOne(id, `${base}${id}.glb`, loader))).then(
      () => undefined,
    );
  }
  return preloadPromise;
}

export function hasEntityModel(id: EntityModelId): boolean {
  return geoCache.has(id);
}

export function getEntityModelGeometry(id: EntityModelId): THREE.BufferGeometry | null {
  return geoCache.get(id) ?? null;
}

export function _resetEntityModelCacheForTests(): void {
  for (const g of geoCache.values()) g.dispose();
  geoCache.clear();
  preloadPromise = null;
}
