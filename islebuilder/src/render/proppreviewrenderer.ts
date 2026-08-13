import * as THREE from 'three';
import type { PropDefinition } from '../props/catalog.ts';
import {
  createPropSpriteMaterial,
  disposePropSpriteMaterial,
  propFeetWorld,
  propWorldSize,
} from './art/propSpriteUtils.ts';
import type { PropAtlas } from './art/propsAtlas.ts';
import { toWorld3 } from '../core/world3d.ts';
import { clonePropModel, hasPropModel } from './propModels.ts';

/**
 * Ghost de colocação de props (verde = válido, vermelho = inválido).
 */
export class PropPreviewRenderer {
  readonly group = new THREE.Group();

  private root: THREE.Object3D | null = null;
  private isBillboard = false;
  private readonly atlas: PropAtlas;

  constructor(atlas: PropAtlas) {
    this.atlas = atlas;
  }

  update(def: PropDefinition | null, tileX: number, tileY: number, valid: boolean): void {
    this.clear();
    if (!def) return;

    const feet = propFeetWorld(def, tileX, tileY);
    const ground = toWorld3(feet.x, feet.y, 0);
    const tint = valid ? 0x88ff99 : 0xff6666;

    if (hasPropModel(def.id)) {
      const model = clonePropModel(def.id)!;
      model.position.copy(ground);
      model.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if ('color' in mat && mat.color instanceof THREE.Color) {
            mat.color.setHex(tint);
          }
          if ('transparent' in mat) {
            (mat as THREE.Material).transparent = true;
            (mat as THREE.MeshBasicMaterial).opacity = 0.55;
          }
        }
        obj.renderOrder = 20;
      });
      this.root = model;
      this.isBillboard = false;
    } else {
      const { w, h } = propWorldSize(def);
      const geo = new THREE.PlaneGeometry(w, h);
      const mat = createPropSpriteMaterial(def, this.atlas, {
        opacity: 0.55,
        color: tint,
        depthTest: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(ground.x, ground.y + h * 0.5, ground.z);
      mesh.renderOrder = 20;
      mesh.userData.billboard = true;
      this.root = mesh;
      this.isBillboard = true;
    }

    this.group.add(this.root);
  }

  faceCamera(camera: THREE.Camera): void {
    if (this.root && this.isBillboard) this.root.lookAt(camera.position);
  }

  private clear(): void {
    if (!this.root) return;
    this.group.remove(this.root);
    if (this.isBillboard && this.root instanceof THREE.Mesh) {
      this.root.geometry.dispose();
      disposePropSpriteMaterial(this.root.material as THREE.Material);
    }
    this.root = null;
    this.isBillboard = false;
  }
}
