import * as THREE from 'three';
import type { PropDefinition } from '../props/catalog.ts';
import { createPropSpriteMaterial, disposePropSpriteMaterial, propFeetWorld, propWorldSize } from './art/propSpriteUtils.ts';
import type { PropAtlas } from './art/propsAtlas.ts';

/**
 * Ghost preview for prop placement (green = valid, red = invalid).
 */
export class PropPreviewRenderer {
  readonly group = new THREE.Group();

  private mesh: THREE.Mesh | null = null;
  private readonly atlas: PropAtlas;

  constructor(atlas: PropAtlas) {
    this.atlas = atlas;
  }

  update(def: PropDefinition | null, tileX: number, tileY: number, valid: boolean): void {
    if (this.mesh) {
      this.group.remove(this.mesh);
      this.mesh.geometry.dispose();
      disposePropSpriteMaterial(this.mesh.material as THREE.Material);
      this.mesh = null;
    }

    if (!def) return;

    const { w, h } = propWorldSize(def);
    const feet = propFeetWorld(def, tileX, tileY);

    const geo = new THREE.PlaneGeometry(w, h);

    const mat = createPropSpriteMaterial(def, this.atlas, {
      opacity: 0.55,
      color: valid ? 0x88ff99 : 0xff6666,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.set(feet.x, feet.y + h * 0.5, 1);
    this.mesh.renderOrder = 20;
    this.group.add(this.mesh);
  }
}
