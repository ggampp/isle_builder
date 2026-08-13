import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { WeaponId } from '../weapons/catalog.ts';

const TARGET_LEN: Record<WeaponId, number> = {
  bullet: 0.34,
  shotgun: 0.58,
  rifle: 0.68,
  bomb: 0.28,
  laser: 0.5,
};

/** Yaw extra depois de alinhar o eixo longo em Z. O rifle do Fal já nasce apontando -Z. */
const EXTRA_YAW: Record<WeaponId, number> = {
  bullet: Math.PI,
  shotgun: Math.PI,
  rifle: 0,
  bomb: 0,
  laser: Math.PI,
};

function box(
  parent: THREE.Group,
  w: number, h: number, d: number,
  x: number, y: number, z: number,
  mat: THREE.Material,
  name: string,
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.name = name;
  parent.add(mesh);
}

function makeMats() {
  return {
    metal: new THREE.MeshStandardMaterial({ color: 0x4a5160, roughness: 0.32, metalness: 0.85 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.4, metalness: 0.7 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7a4a28, roughness: 0.82, metalness: 0.05 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb08a3a, roughness: 0.35, metalness: 0.7 }),
    glow: new THREE.MeshStandardMaterial({ color: 0x4ec4ff, emissive: 0x1aa0ff, emissiveIntensity: 1.8, roughness: 0.25 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb43028, roughness: 0.7, metalness: 0.1 }),
  };
}

function prepareWeapon(scene: THREE.Object3D, id: WeaponId): THREE.Group {
  const root = new THREE.Group();
  root.name = `vm:${id}`;
  root.add(scene);

  scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.frustumCulled = false;
  });

  scene.updateMatrixWorld(true);
  const box0 = new THREE.Box3().setFromObject(scene);
  const size = box0.getSize(new THREE.Vector3());
  const center = box0.getCenter(new THREE.Vector3());
  scene.position.sub(center);

  if (id !== 'bomb') {
    if (size.x >= size.y && size.x >= size.z) scene.rotation.y = Math.PI / 2;
    else if (size.y >= size.x && size.y >= size.z) scene.rotation.x = Math.PI / 2;
    scene.rotation.y += EXTRA_YAW[id];
  }

  scene.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const dim = id === 'bomb'
    ? Math.max(fittedSize.y, 1e-4)
    : Math.max(fittedSize.x, fittedSize.y, fittedSize.z, 1e-4);
  root.scale.setScalar(TARGET_LEN[id] / dim);

  root.updateMatrixWorld(true);
  const finalBox = new THREE.Box3().setFromObject(root);
  root.position.sub(finalBox.getCenter(new THREE.Vector3()));
  if (id !== 'bomb') {
    root.position.z -= 0.04;
    root.position.y -= 0.02;
  }
  return root;
}

export class Viewmodel {
  readonly group = new THREE.Group();
  private guns = new Map<WeaponId, THREE.Group>();
  private kick = 0;
  private active: WeaponId = 'shotgun';

  constructor() {
    this.group.name = 'viewmodel';
    this.group.position.set(0.28, -0.26, -0.52);
    const m = makeMats();

    const pistol = new THREE.Group();
    box(pistol, 0.05, 0.09, 0.22, 0, 0.04, -0.08, m.dark, 'barrel');
    box(pistol, 0.07, 0.08, 0.12, 0, 0.02, 0.06, m.metal, 'receiver');
    box(pistol, 0.05, 0.14, 0.07, 0, -0.08, 0.1, m.wood, 'grip');
    this.guns.set('bullet', pistol);

    const shotgun = new THREE.Group();
    box(shotgun, 0.06, 0.06, 0.42, 0, 0.05, -0.12, m.metal, 'barrel');
    box(shotgun, 0.08, 0.08, 0.16, 0, 0.03, 0.08, m.dark, 'receiver');
    box(shotgun, 0.07, 0.06, 0.14, 0, -0.02, 0.0, m.wood, 'pump');
    box(shotgun, 0.06, 0.16, 0.08, 0, -0.1, 0.14, m.wood, 'stock');
    this.guns.set('shotgun', shotgun);

    const rifle = new THREE.Group();
    box(rifle, 0.045, 0.045, 0.5, 0, 0.06, -0.14, m.metal, 'barrel');
    box(rifle, 0.07, 0.09, 0.18, 0, 0.03, 0.08, m.brass, 'receiver');
    box(rifle, 0.05, 0.12, 0.06, 0, -0.06, 0.04, m.wood, 'lever');
    box(rifle, 0.07, 0.14, 0.16, 0, -0.08, 0.16, m.wood, 'stock');
    this.guns.set('rifle', rifle);

    const bomb = new THREE.Group();
    box(bomb, 0.08, 0.22, 0.08, 0, 0.0, 0.0, m.red, 'stick');
    box(bomb, 0.03, 0.08, 0.03, 0, 0.14, 0.0, m.wood, 'fuse');
    this.guns.set('bomb', bomb);

    const laser = new THREE.Group();
    box(laser, 0.07, 0.07, 0.36, 0, 0.04, -0.1, m.dark, 'barrel');
    box(laser, 0.1, 0.1, 0.14, 0, 0.04, 0.08, m.brass, 'body');
    box(laser, 0.08, 0.08, 0.1, 0, 0.04, 0.0, m.glow, 'chamber');
    box(laser, 0.05, 0.14, 0.07, 0, -0.08, 0.12, m.dark, 'grip');
    this.guns.set('laser', laser);

    for (const [id, g] of this.guns) {
      g.visible = id === this.active;
      this.group.add(g);
    }
  }

  async loadGenerated(): Promise<void> {
    const loader = new GLTFLoader();
    const base = `${import.meta.env.BASE_URL}assets/models/`;
    const ids: WeaponId[] = ['bullet', 'shotgun', 'rifle', 'bomb', 'laser'];
    await Promise.all(ids.map(async (id) => {
      try {
        const gltf = await loader.loadAsync(`${base}${id}.glb`);
        const prepared = prepareWeapon(gltf.scene, id);
        const old = this.guns.get(id);
        if (old) this.group.remove(old);
        prepared.visible = id === this.active;
        this.guns.set(id, prepared);
        this.group.add(prepared);
      } catch {
        // Mantém os blocos procedurais se o GLB não existir.
      }
    }));
  }

  setWeapon(id: WeaponId): void {
    this.active = id;
    for (const [wid, g] of this.guns) g.visible = wid === id;
  }

  cloneForWorld(id: WeaponId): THREE.Object3D | null {
    const src = this.guns.get(id);
    if (!src) return null;
    const clone = src.clone(true);
    clone.visible = true;
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.frustumCulled = true;
      obj.castShadow = true;
    });
    return clone;
  }

  fireKick(): void {
    this.kick = 1;
  }

  update(dt: number): void {
    this.kick = Math.max(0, this.kick - dt * 6);
    this.group.position.z = -0.52 - this.kick * 0.09;
    this.group.rotation.x = this.kick * 0.12;
  }
}
