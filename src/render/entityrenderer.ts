import * as THREE from 'three';
import { SIM_CONFIG } from '../entities/config.ts';
import type { EntityManager } from '../entities/manager.ts';
import { EntityKind } from '../entities/types.ts';
import {
  createEntityMaterial,
  EntitySprite,
  updateEntityMaterialFrame,
  type EntityAtlas,
  type EntitySpriteId,
} from './entityAtlas.ts';
import { entitySpriteSize, type EntitySpriteKind } from './art/worldScale.ts';
import { Palette } from './art/palette.ts';

const MAX_V = SIM_CONFIG.maxVillagers;
const MAX_F = SIM_CONFIG.maxFish;
const MAX_M = SIM_CONFIG.maxLargeMarine;
const MAX_S = SIM_CONFIG.maxShips;

interface Bucket {
  mesh: THREE.InstancedMesh;
  shadow: THREE.InstancedMesh | null;
  material: THREE.MeshBasicMaterial;
  spriteId: EntitySpriteId;
  max: number;
  frame: number;
  animTick: number;
}

/**
 * Instanced rendering for all simulation agents — one draw call per species bucket.
 */
export class EntityRenderer {
  readonly group = new THREE.Group();

  private readonly atlas: EntityAtlas;
  private readonly buckets = new Map<string, Bucket>();
  private readonly shadowMat: THREE.MeshBasicMaterial;
  private readonly dummy = new THREE.Object3D();
  private globalFrame = 0;
  private lodSkip = 1;

  constructor(atlas: EntityAtlas) {
    this.atlas = atlas;
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(Palette.shadow),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      depthTest: false,
    });

    this.addBucket('villager', EntitySprite.Villager, MAX_V, 'villager', true);
    this.addBucket('fish', EntitySprite.Fish, MAX_F, 'fish', false);
    this.addBucket('whale', EntitySprite.Whale, MAX_M, 'whale', false);
    this.addBucket('shark', EntitySprite.Shark, MAX_M, 'shark', false);
    this.addBucket('orca', EntitySprite.Orca, MAX_M, 'orca', false);
    this.addBucket('swordfish', EntitySprite.Swordfish, MAX_M, 'swordfish', false);
    this.addBucket('rowboat', EntitySprite.Rowboat, MAX_S, 'rowboat', false);
    this.addBucket('galleon', EntitySprite.Galleon, MAX_S, 'galleon', false);
    this.addBucket('spray', EntitySprite.Spray, 8, 'spray', false);
  }

  private addBucket(
    key: string,
    spriteId: EntitySpriteId,
    max: number,
    sizeKind: EntitySpriteKind,
    shadow: boolean,
  ): void {
    const { w, h } = entitySpriteSize(sizeKind);
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = createEntityMaterial(this.atlas, spriteId, 0);
    const mesh = new THREE.InstancedMesh(geo, mat, max);
    mesh.count = 0;
    mesh.renderOrder = 12;
    mesh.frustumCulled = false;
    this.group.add(mesh);

    let shadowMesh: THREE.InstancedMesh | null = null;
    if (shadow) {
      const sGeo = new THREE.PlaneGeometry(w * 0.7, h * 0.25);
      shadowMesh = new THREE.InstancedMesh(sGeo, this.shadowMat, max);
      shadowMesh.count = 0;
      shadowMesh.renderOrder = 11.5;
      shadowMesh.frustumCulled = false;
      this.group.add(shadowMesh);
    }

    this.buckets.set(key, {
      mesh,
      shadow: shadowMesh,
      material: mat,
      spriteId,
      max,
      frame: 0,
      animTick: 0,
    });
  }

  sync(manager: EntityManager, cameraX: number, cameraY: number, simPaused: boolean): void {
    if (!simPaused) {
      this.updateLod(cameraX, cameraY);
      this.globalFrame++;
      if (this.globalFrame % this.lodSkip === 0) {
        for (const b of this.buckets.values()) {
          b.animTick++;
          const entry = b.spriteId;
          const frames = entry === EntitySprite.Rowboat ? 2 : entry === EntitySprite.Spray ? 1 : 4;
          b.frame = b.animTick % frames;
          updateEntityMaterialFrame(b.material, this.atlas, b.spriteId, b.frame);
        }
      }
    }

    this.fillVillagers(manager, cameraX, cameraY);
    this.fillFish(manager);
    this.fillMarine(manager);
    this.fillShips(manager);
    this.fillSprays(manager);
  }

  private updateLod(cameraX: number, cameraY: number): void {
    const dist = Math.hypot(cameraX, cameraY);
    if (dist > SIM_CONFIG.lodDistanceFar) this.lodSkip = SIM_CONFIG.lodAnimSkipVeryFar;
    else if (dist > SIM_CONFIG.lodDistanceNear) this.lodSkip = SIM_CONFIG.lodAnimSkipFar;
    else this.lodSkip = 1;
  }

  private fillVillagers(manager: EntityManager, cameraX: number, cameraY: number): void {
    const b = this.buckets.get('villager')!;
    let i = 0;
    for (const v of manager.villagers) {
      if (i >= b.max) break;
      const dist = Math.hypot(v.x - cameraX, v.y - cameraY);
      if (dist > SIM_CONFIG.lodDistanceFar * 1.5) continue;

      this.dummy.position.set(v.x, v.y, 0.55);
      this.dummy.scale.set(v.dir === 3 ? -1 : 1, v.dir === 0 ? -1 : 1, 1);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      b.mesh.setMatrixAt(i, this.dummy.matrix);

      if (b.shadow) {
        this.dummy.position.set(v.x, v.y - 2, 0.25);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        b.shadow.setMatrixAt(i, this.dummy.matrix);
      }
      i++;
    }
    b.mesh.count = i;
    b.mesh.instanceMatrix.needsUpdate = true;
    if (b.shadow) {
      b.shadow.count = i;
      b.shadow.instanceMatrix.needsUpdate = true;
    }
  }

  private fillFish(manager: EntityManager): void {
    const b = this.buckets.get('fish')!;
    let i = 0;
    for (const f of manager.fish) {
      if (i >= b.max) break;
      const angle = Math.atan2(f.vy, f.vx);
      this.dummy.position.set(f.x, f.y, 0.45);
      this.dummy.rotation.set(0, 0, angle);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      b.mesh.setMatrixAt(i, this.dummy.matrix);
      i++;
    }
    b.mesh.count = i;
    b.mesh.instanceMatrix.needsUpdate = true;
  }

  private fillMarine(manager: EntityManager): void {
    const keys: Record<number, string> = {
      [EntityKind.Whale]: 'whale',
      [EntityKind.Shark]: 'shark',
      [EntityKind.Orca]: 'orca',
      [EntityKind.Swordfish]: 'swordfish',
    };
    const counts = new Map<string, number>([
      ['whale', 0], ['shark', 0], ['orca', 0], ['swordfish', 0],
    ]);

    for (const m of manager.marine) {
      const key = keys[m.kind];
      if (!key) continue;
      const b = this.buckets.get(key)!;
      const i = counts.get(key) ?? 0;
      if (i >= b.max) continue;

      this.dummy.position.set(m.x, m.y, 0.4);
      this.dummy.rotation.set(0, 0, m.angle);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      b.mesh.setMatrixAt(i, this.dummy.matrix);
      counts.set(key, i + 1);
    }

    for (const key of ['whale', 'shark', 'orca', 'swordfish']) {
      const b = this.buckets.get(key)!;
      b.mesh.count = counts.get(key) ?? 0;
      b.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private fillShips(manager: EntityManager): void {
    const boat = this.buckets.get('rowboat')!;
    const galleon = this.buckets.get('galleon')!;
    let bi = 0;
    let gi = 0;

    for (const s of manager.ships) {
      if (s.kind === EntityKind.Rowboat) {
        if (bi >= boat.max) continue;
        this.dummy.position.set(s.x, s.y, 0.42);
        this.dummy.rotation.set(0, 0, s.angle);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        boat.mesh.setMatrixAt(bi, this.dummy.matrix);
        bi++;
      } else {
        if (gi >= galleon.max) continue;
        this.dummy.position.set(s.x, s.y, 0.42);
        this.dummy.rotation.set(0, 0, s.angle);
        this.dummy.scale.set(1, 1, 1);
        this.dummy.updateMatrix();
        galleon.mesh.setMatrixAt(gi, this.dummy.matrix);
        gi++;
      }
    }
    boat.mesh.count = bi;
    galleon.mesh.count = gi;
    boat.mesh.instanceMatrix.needsUpdate = true;
    galleon.mesh.instanceMatrix.needsUpdate = true;
  }

  private fillSprays(manager: EntityManager): void {
    const b = this.buckets.get('spray')!;
    let i = 0;
    for (const m of manager.marine) {
      if (m.kind !== EntityKind.Whale) continue;
      if (m.sprayCooldown > 0.3) continue;
      if (i >= b.max) break;
      const sprayH = entitySpriteSize('spray').h;
      this.dummy.position.set(m.x, m.y + sprayH * 0.85, 0.65);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      b.mesh.setMatrixAt(i, this.dummy.matrix);
      i++;
    }
    b.mesh.count = i;
    b.mesh.instanceMatrix.needsUpdate = true;
  }
}
