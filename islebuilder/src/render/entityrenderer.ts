import * as THREE from 'three';
import { SIM_CONFIG } from '../entities/config.ts';
import type { EntityManager } from '../entities/manager.ts';
import { EntityKind, VillagerDir } from '../entities/types.ts';
import {
  createEntityMaterial,
  EntitySprite,
  updateEntityMaterialFrame,
  type EntityAtlas,
  type EntitySpriteId,
} from './entityAtlas.ts';
import { entitySpriteSize, type EntitySpriteKind } from './art/worldScale.ts';
import { Palette } from './art/palette.ts';
import { toWorld3 } from '../core/world3d.ts';
import {
  getEntityModelGeometry,
  hasEntityModel,
  type EntityModelId,
} from './entityModels.ts';

const MAX_V = SIM_CONFIG.maxVillagers;
const MAX_F = SIM_CONFIG.maxFish;
const MAX_M = SIM_CONFIG.maxLargeMarine;
const MAX_S = SIM_CONFIG.maxShips;

/** Yaw para aldeão: modelo olha +Z (sul lógico). */
const VILLAGER_YAW: Record<number, number> = {
  [VillagerDir.South]: 0,
  [VillagerDir.North]: Math.PI,
  [VillagerDir.East]: Math.PI / 2,
  [VillagerDir.West]: -Math.PI / 2,
};

/**
 * Ângulo lógico atan2(dy,dx) → yaw Three.js (modelo +Z).
 * Mundo: (dx, 0, -dy).
 */
function logicalAngleToYaw(angle: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  return Math.atan2(dx, -dy);
}

interface MeshBucket {
  mesh: THREE.InstancedMesh;
  shadow: THREE.InstancedMesh | null;
  material: THREE.Material;
  spriteId: EntitySpriteId | null;
  max: number;
  frame: number;
  animTick: number;
  halfH: number;
  isModel: boolean;
  waterLift: number;
}

/**
 * Agentes 3D (GLB instanciado) com fallback billboard do atlas.
 */
export class EntityRenderer {
  readonly group = new THREE.Group();

  private readonly atlas: EntityAtlas;
  private readonly buckets = new Map<string, MeshBucket>();
  private readonly shadowMat: THREE.MeshBasicMaterial;
  private readonly modelMat: THREE.MeshLambertMaterial;
  private readonly dummy = new THREE.Object3D();
  private readonly lookDummy = new THREE.Object3D();
  private globalFrame = 0;
  private lodSkip = 1;

  constructor(atlas: EntityAtlas) {
    this.atlas = atlas;
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(Palette.shadow),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      depthTest: true,
    });
    this.modelMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true,
    });

    this.addBucket('villager', EntitySprite.Villager, MAX_V, 'villager', true, 'villager', 0);
    this.addBucket('fish', EntitySprite.Fish, MAX_F, 'fish', false, 'fish', 0.35);
    this.addBucket('whale', EntitySprite.Whale, MAX_M, 'whale', false, 'whale', 0.25);
    this.addBucket('shark', EntitySprite.Shark, MAX_M, 'shark', false, 'shark', 0.3);
    this.addBucket('orca', EntitySprite.Orca, MAX_M, 'orca', false, 'orca', 0.3);
    this.addBucket('swordfish', EntitySprite.Swordfish, MAX_M, 'swordfish', false, 'swordfish', 0.3);
    this.addBucket('rowboat', EntitySprite.Rowboat, MAX_S, 'rowboat', false, null, 0);
    this.addBucket('galleon', EntitySprite.Galleon, MAX_S, 'galleon', false, null, 0);
    this.addBucket('spray', EntitySprite.Spray, 8, 'spray', false, null, 0);
  }

  private addBucket(
    key: string,
    spriteId: EntitySpriteId,
    max: number,
    sizeKind: EntitySpriteKind,
    shadow: boolean,
    modelId: EntityModelId | null,
    waterLift: number,
  ): void {
    const { w, h } = entitySpriteSize(sizeKind);
    const useModel = modelId !== null && hasEntityModel(modelId);
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    let isModel = false;

    if (useModel && modelId) {
      geometry = getEntityModelGeometry(modelId)!;
      material = this.modelMat;
      isModel = true;
    } else {
      geometry = new THREE.PlaneGeometry(w, h);
      const mat = createEntityMaterial(this.atlas, spriteId, 0);
      mat.depthTest = true;
      mat.depthWrite = false;
      material = mat;
    }

    const mesh = new THREE.InstancedMesh(geometry, material, max);
    mesh.count = 0;
    mesh.renderOrder = 12;
    mesh.frustumCulled = false;
    mesh.castShadow = isModel;
    this.group.add(mesh);

    let shadowMesh: THREE.InstancedMesh | null = null;
    if (shadow) {
      const sGeo = new THREE.PlaneGeometry(w * 0.7, h * 0.25);
      sGeo.rotateX(-Math.PI / 2);
      shadowMesh = new THREE.InstancedMesh(sGeo, this.shadowMat, max);
      shadowMesh.count = 0;
      shadowMesh.renderOrder = 11.5;
      shadowMesh.frustumCulled = false;
      this.group.add(shadowMesh);
    }

    this.buckets.set(key, {
      mesh,
      shadow: shadowMesh,
      material,
      spriteId: isModel ? null : spriteId,
      max,
      frame: 0,
      animTick: 0,
      halfH: h * 0.5,
      isModel,
      waterLift,
    });
  }

  sync(
    manager: EntityManager,
    cameraX: number,
    cameraY: number,
    simPaused: boolean,
    camera?: THREE.Camera,
  ): void {
    if (!simPaused) {
      this.updateLod(cameraX, cameraY);
      this.globalFrame++;
      if (this.globalFrame % this.lodSkip === 0) {
        for (const b of this.buckets.values()) {
          if (b.spriteId === null) continue;
          b.animTick++;
          const entry = b.spriteId;
          const frames = entry === EntitySprite.Rowboat ? 2 : entry === EntitySprite.Spray ? 1 : 4;
          b.frame = b.animTick % frames;
          updateEntityMaterialFrame(b.material as THREE.MeshBasicMaterial, this.atlas, b.spriteId, b.frame);
        }
      }
    }

    const camPos = camera?.position ?? toWorld3(cameraX, cameraY, 80);

    this.fillVillagers(manager, cameraX, cameraY, camPos);
    this.fillFish(manager, camPos);
    this.fillMarine(manager, camPos);
    this.fillShips(manager, camPos);
    this.fillSprays(manager, camPos);
  }

  private updateLod(cameraX: number, cameraY: number): void {
    const dist = Math.hypot(cameraX, cameraY);
    if (dist > SIM_CONFIG.lodDistanceFar) this.lodSkip = SIM_CONFIG.lodAnimSkipVeryFar;
    else if (dist > SIM_CONFIG.lodDistanceNear) this.lodSkip = SIM_CONFIG.lodAnimSkipFar;
    else this.lodSkip = 1;
  }

  private placeBillboard(
    x: number,
    y: number,
    halfH: number,
    camPos: THREE.Vector3,
    scaleX = 1,
    yawExtra = 0,
  ): void {
    const p = toWorld3(x, y, halfH);
    this.dummy.position.copy(p);
    this.lookDummy.position.copy(p);
    this.lookDummy.lookAt(camPos);
    this.dummy.quaternion.copy(this.lookDummy.quaternion);
    if (yawExtra !== 0) this.dummy.rotateY(yawExtra);
    this.dummy.scale.set(scaleX, 1, 1);
    this.dummy.updateMatrix();
  }

  private placeModel(x: number, yLogical: number, yaw: number, lift = 0, scale = 1): void {
    const p = toWorld3(x, yLogical, lift);
    this.dummy.position.copy(p);
    this.dummy.rotation.set(0, yaw, 0);
    this.dummy.scale.set(scale, scale, scale);
    this.dummy.updateMatrix();
  }

  private fillVillagers(
    manager: EntityManager,
    cameraX: number,
    cameraY: number,
    camPos: THREE.Vector3,
  ): void {
    const b = this.buckets.get('villager')!;
    let i = 0;
    for (const v of manager.villagers) {
      if (i >= b.max) break;
      const dist = Math.hypot(v.x - cameraX, v.y - cameraY);
      if (dist > SIM_CONFIG.lodDistanceFar * 1.5) continue;

      if (b.isModel) {
        const yaw = VILLAGER_YAW[v.dir] ?? 0;
        // leve variação de escala por variant
        const scale = 0.92 + (v.variant % 4) * 0.04;
        this.placeModel(v.x, v.y, yaw, 0, scale);
      } else {
        this.placeBillboard(v.x, v.y, b.halfH, camPos, v.dir === VillagerDir.West ? -1 : 1);
      }
      b.mesh.setMatrixAt(i, this.dummy.matrix);

      if (b.shadow) {
        const sp = toWorld3(v.x, v.y, 0.05);
        this.dummy.position.copy(sp);
        this.dummy.quaternion.identity();
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

  private fillFish(manager: EntityManager, camPos: THREE.Vector3): void {
    const b = this.buckets.get('fish')!;
    let i = 0;
    for (const f of manager.fish) {
      if (i >= b.max) break;
      const angle = Math.atan2(f.vy, f.vx);
      if (b.isModel) {
        this.placeModel(f.x, f.y, logicalAngleToYaw(angle), b.waterLift, 0.9 + f.hue * 0.2);
      } else {
        this.placeBillboard(f.x, f.y, b.halfH * 0.4, camPos, 1, -angle);
      }
      b.mesh.setMatrixAt(i, this.dummy.matrix);
      i++;
    }
    b.mesh.count = i;
    b.mesh.instanceMatrix.needsUpdate = true;
  }

  private fillMarine(manager: EntityManager, camPos: THREE.Vector3): void {
    const keys: Record<number, string> = {
      [EntityKind.Whale]: 'whale',
      [EntityKind.Shark]: 'shark',
      [EntityKind.Orca]: 'orca',
      [EntityKind.Swordfish]: 'swordfish',
    };
    const counts = new Map<string, number>([
      ['whale', 0],
      ['shark', 0],
      ['orca', 0],
      ['swordfish', 0],
    ]);

    for (const m of manager.marine) {
      const key = keys[m.kind];
      if (!key) continue;
      const b = this.buckets.get(key)!;
      const i = counts.get(key) ?? 0;
      if (i >= b.max) continue;

      if (b.isModel) {
        this.placeModel(m.x, m.y, logicalAngleToYaw(m.angle), b.waterLift);
      } else {
        this.placeBillboard(m.x, m.y, b.halfH * 0.35, camPos, 1, -m.angle);
      }
      b.mesh.setMatrixAt(i, this.dummy.matrix);
      counts.set(key, i + 1);
    }

    for (const key of ['whale', 'shark', 'orca', 'swordfish']) {
      const b = this.buckets.get(key)!;
      b.mesh.count = counts.get(key) ?? 0;
      b.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private fillShips(manager: EntityManager, camPos: THREE.Vector3): void {
    const boat = this.buckets.get('rowboat')!;
    const galleon = this.buckets.get('galleon')!;
    let bi = 0;
    let gi = 0;

    for (const s of manager.ships) {
      if (s.kind === EntityKind.Rowboat) {
        if (bi >= boat.max) continue;
        this.placeBillboard(s.x, s.y, boat.halfH * 0.4, camPos, 1, -s.angle);
        boat.mesh.setMatrixAt(bi, this.dummy.matrix);
        bi++;
      } else {
        if (gi >= galleon.max) continue;
        this.placeBillboard(s.x, s.y, galleon.halfH * 0.4, camPos, 1, -s.angle);
        galleon.mesh.setMatrixAt(gi, this.dummy.matrix);
        gi++;
      }
    }
    boat.mesh.count = bi;
    galleon.mesh.count = gi;
    boat.mesh.instanceMatrix.needsUpdate = true;
    galleon.mesh.instanceMatrix.needsUpdate = true;
  }

  private fillSprays(manager: EntityManager, camPos: THREE.Vector3): void {
    const b = this.buckets.get('spray')!;
    let i = 0;
    for (const m of manager.marine) {
      if (m.kind !== EntityKind.Whale) continue;
      if (m.sprayCooldown > 0.3) continue;
      if (i >= b.max) break;
      this.placeBillboard(m.x, m.y, b.halfH * 1.4, camPos);
      b.mesh.setMatrixAt(i, this.dummy.matrix);
      i++;
    }
    b.mesh.count = i;
    b.mesh.instanceMatrix.needsUpdate = true;
  }
}
