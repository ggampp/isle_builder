import * as THREE from 'three';
import type { PropDefinition } from '../props/catalog.ts';
import { getPropDefinition } from '../props/catalog.ts';
import type { PropMap } from '../props/propmap.ts';
import { propSortY } from '../props/placement.ts';
import type { PropAtlas } from './art/propsAtlas.ts';
import {
  createPropSpriteMaterial,
  disposePropSpriteMaterial,
  propFeetWorld,
  propWorldSize,
} from './art/propSpriteUtils.ts';
import { Palette } from './art/palette.ts';
import { toWorld3 } from '../core/world3d.ts';
import { clonePropModel, hasPropModel } from './propModels.ts';

interface PropMeshes {
  shadow: THREE.Mesh;
  /** GLB root ou plane billboard. */
  visual: THREE.Object3D;
  isBillboard: boolean;
}

/**
 * Props em 3D: GLB quando disponível; senão billboard vertical do atlas.
 */
export class PropRenderer {
  readonly group = new THREE.Group();

  private readonly propMap: PropMap;
  private readonly atlas: PropAtlas;
  private readonly shadowMaterial: THREE.MeshBasicMaterial;
  private readonly meshes = new Map<string, PropMeshes>();
  private dirty = true;

  constructor(propMap: PropMap, atlas: PropAtlas) {
    this.propMap = propMap;
    this.atlas = atlas;
    this.shadowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(Palette.shadow),
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      depthTest: true,
    });
  }

  markDirty(): void {
    this.dirty = true;
  }

  rebuildIfDirty(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.rebuildAll();
  }

  /** Billboard sprites olham para a câmera. */
  faceCamera(camera: THREE.Camera): void {
    for (const entry of this.meshes.values()) {
      if (!entry.isBillboard) continue;
      entry.visual.lookAt(camera.position);
    }
  }

  private rebuildAll(): void {
    for (const meshes of this.meshes.values()) {
      this.group.remove(meshes.shadow, meshes.visual);
      meshes.shadow.geometry.dispose();
      this.disposeVisual(meshes.visual, meshes.isBillboard);
    }
    this.meshes.clear();

    const sorted = [...this.propMap.all()].sort((a, b) => {
      const da = getPropDefinition(a.defId);
      const db = getPropDefinition(b.defId);
      if (!da || !db) return 0;
      return propSortY(db, b.tileY) - propSortY(da, a.tileY);
    });

    const total = sorted.length;
    sorted.forEach((prop, i) => {
      const def = getPropDefinition(prop.defId);
      if (!def) return;
      const order = total > 1 ? 10 + (i / (total - 1)) * 1.9 : 10;
      this.createPropMeshes(prop, def, order);
    });
  }

  private disposeVisual(visual: THREE.Object3D, isBillboard: boolean): void {
    if (isBillboard && visual instanceof THREE.Mesh) {
      visual.geometry.dispose();
      disposePropSpriteMaterial(visual.material as THREE.Material);
      return;
    }
    visual.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      // Geometria compartilhada com o template — não dispose.
    });
  }

  private createPropMeshes(
    prop: { uid: string; tileX: number; tileY: number; scale?: number; flip?: boolean },
    def: PropDefinition,
    renderOrder: number,
  ): void {
    const variation = prop.scale ?? 1;
    const base = propWorldSize(def);
    const w = base.w * variation;
    const h = base.h * variation;
    const feet = propFeetWorld(def, prop.tileX, prop.tileY);
    const ground = toWorld3(feet.x, feet.y, 0);

    let visual: THREE.Object3D;
    let isBillboard = false;

    if (hasPropModel(def.id)) {
      const model = clonePropModel(def.id)!;
      model.position.copy(ground);
      model.scale.multiplyScalar(variation);
      if (prop.flip) model.rotation.y = Math.PI;
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) obj.renderOrder = renderOrder;
      });
      visual = model;
    } else {
      const spriteGeo = new THREE.PlaneGeometry(w, h);
      const spriteMat = createPropSpriteMaterial(def, this.atlas, {
        depthTest: true,
        depthWrite: false,
      });
      const sprite = new THREE.Mesh(spriteGeo, spriteMat);
      sprite.position.set(ground.x, ground.y + h * 0.5, ground.z);
      if (prop.flip) sprite.scale.x = -1;
      sprite.renderOrder = renderOrder;
      sprite.userData.billboard = true;
      visual = sprite;
      isBillboard = true;
    }

    const shadowW = w * def.shadowScale * 0.5;
    const shadowH = shadowW * 0.4;
    const shadowGeo = new THREE.PlaneGeometry(shadowW, shadowH);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadow = new THREE.Mesh(shadowGeo, this.shadowMaterial);
    shadow.position.set(ground.x, 0.05, ground.z);
    shadow.renderOrder = renderOrder - 0.5;

    this.group.add(shadow, visual);
    this.meshes.set(prop.uid, { shadow, visual, isBillboard });
  }
}
