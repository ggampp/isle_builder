import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from './materials.ts';
import type { MaterialLibrary } from './materials.ts';

export type ModelKind = 'emitter' | 'target' | 'mirror' | 'wall' | 'tile' | 'crystal' | 'lamp' | 'column';

const URLS: Record<ModelKind, string> = {
  emitter: 'assets/models/emitter.glb',
  target: 'assets/models/target.glb',
  mirror: 'assets/models/mirror.glb',
  wall: 'assets/models/wall.glb',
  tile: 'assets/models/tile.glb',
  crystal: 'assets/models/crystal.glb',
  lamp: 'assets/models/lamp.glb',
  column: 'assets/models/column.glb',
};

const FIT: Record<ModelKind, { height?: number; footprint?: number }> = {
  emitter: { height: 0.92, footprint: 0.7 },
  target: { height: 0.88, footprint: 0.72 },
  mirror: { height: 0.86, footprint: 0.82 },
  wall: { height: 0.9, footprint: 0.88 },
  tile: { height: 0.07, footprint: 1.04 },
  crystal: { height: 0.38, footprint: 0.32 },
  lamp: { height: 1.6 },
  column: { height: 4.4 },
};

export interface ImportedStats {
  kind: ModelKind;
  triangles: number;
  meshes: number;
  materials: number;
  bytes: number;
}

function flattenAndShadow(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
}

function cloneMaterials(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (Array.isArray(obj.material)) obj.material = obj.material.map((m) => m.clone());
    else if (obj.material) obj.material = obj.material.clone();
  });
}

function fitModel(root: THREE.Object3D, kind: ModelKind): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const spec = FIT[kind];
  let scale = 1;
  if (spec.footprint) {
    const xz = Math.max(size.x, size.z);
    if (xz > 1e-4) scale = spec.footprint / xz;
  }
  if (spec.height && size.y > 1e-4) {
    const byH = spec.height / size.y;
    scale = spec.footprint ? Math.min(scale, byH) : byH;
  }
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  root.position.x -= (fitted.min.x + fitted.max.x) / 2;
  root.position.z -= (fitted.min.z + fitted.max.z) / 2;
  root.position.y -= fitted.min.y;
}

function countTriangles(root: THREE.Object3D): { triangles: number; meshes: number; materials: number } {
  let triangles = 0;
  let meshes = 0;
  const mats = new Set<THREE.Material>();
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    meshes += 1;
    const geo = obj.geometry;
    const index = geo.getIndex();
    triangles += index ? index.count / 3 : (geo.getAttribute('position')?.count ?? 0) / 3;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of list) if (m) mats.add(m);
  });
  return { triangles, meshes, materials: mats.size };
}

function proceduralEmitter(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'proc:emitter';
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.42, 8), mats.slate);
  body.position.y = 0.28;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 16), mats.brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.42;
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mats.glass);
  lens.position.set(0, 0.38, 0.18);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.1, 8), mats.brass);
  cap.position.y = 0.54;
  for (const m of [body, ring, lens, cap]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

function proceduralTarget(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'proc:target';
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.16, 8), mats.brass);
  pedestal.position.y = 0.08;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 20), mats.brass);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.38;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), mats.glass);
  gem.position.y = 0.38;
  gem.name = 'gem';
  for (const m of [pedestal, ring, gem]) {
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

function proceduralMirror(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'proc:mirror';
  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.05), mats.glass);
  pane.position.y = 0.38;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.68, 0.08), mats.brass);
  frame.position.y = 0.38;
  pane.castShadow = true;
  frame.castShadow = true;
  g.add(frame, pane);
  return g;
}

function proceduralWall(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'proc:wall';
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.72, 0.88), mats.obsidian);
  block.position.y = 0.36;
  block.castShadow = true;
  block.receiveShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 0.94), mats.brass);
  cap.position.y = 0.75;
  cap.castShadow = true;
  g.add(block, cap);
  return g;
}

function proceduralTile(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'proc:tile';
  const slab = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.07, 1.02), mats.slate);
  slab.position.y = 0.035;
  slab.receiveShadow = true;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.02, 1.06), mats.goldTrim);
  trim.position.y = 0.075;
  g.add(slab, trim);
  return g;
}

function proceduralCrystal(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'proc:crystal';
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mats.glass);
  gem.position.y = 0.18;
  gem.castShadow = true;
  g.add(gem);
  return g;
}

function proceduralLamp(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'proc:lamp';
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 0.28, 10), mats.slate);
  shade.position.y = 1.35;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mats.emissive);
  bulb.position.y = 1.22;
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), mats.brass);
  chain.position.y = 1.7;
  g.add(shade, bulb, chain);
  return g;
}

function proceduralColumn(mats: MaterialLibrary): THREE.Group {
  const g = new THREE.Group();
  g.name = 'proc:column';
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.6, 10), mats.marble);
  shaft.position.y = 2.0;
  shaft.castShadow = true;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.7), mats.brass);
  base.position.y = 0.11;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.72), mats.brass);
  cap.position.y = 3.9;
  g.add(shaft, base, cap);
  return g;
}

const FALLBACKS: Record<ModelKind, (mats: MaterialLibrary) => THREE.Group> = {
  emitter: proceduralEmitter,
  target: proceduralTarget,
  mirror: proceduralMirror,
  wall: proceduralWall,
  tile: proceduralTile,
  crystal: proceduralCrystal,
  lamp: proceduralLamp,
  column: proceduralColumn,
};

export class ModelCatalog {
  private cache = new Map<ModelKind, THREE.Object3D>();
  readonly stats: ImportedStats[] = [];
  private mats: MaterialLibrary;

  constructor(mats: MaterialLibrary) {
    this.mats = mats;
  }

  async preload(): Promise<void> {
    const loader = new GLTFLoader();
    await Promise.all((Object.keys(URLS) as ModelKind[]).map(async (kind) => {
      if (kind === 'tile' || kind === 'crystal') {
        this.cache.set(kind, FALLBACKS[kind](this.mats));
        return;
      }
      const url = assetUrl(URLS[kind]);
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const gltf = await loader.loadAsync(url);
        const root = new THREE.Group();
        root.name = `model:${kind}`;
        root.add(gltf.scene);
        flattenAndShadow(root);
        fitModel(root, kind);
        this.cache.set(kind, root);
        const counts = countTriangles(root);
        this.stats.push({ kind, ...counts, bytes: res.headers.get('content-length') ? Number(res.headers.get('content-length')) : 0 });
      } catch {
        this.cache.set(kind, FALLBACKS[kind](this.mats));
      }
    }));
  }

  clone(kind: ModelKind): THREE.Group {
    const template = this.cache.get(kind) ?? FALLBACKS[kind](this.mats);
    const cloned = template.clone(true);
    const group = cloned instanceof THREE.Group ? cloned : new THREE.Group().add(cloned);
    cloneMaterials(group);
    return group;
  }

  hasImported(kind: ModelKind): boolean {
    const t = this.cache.get(kind);
    return !!t && t.name.startsWith('model:');
  }
}
