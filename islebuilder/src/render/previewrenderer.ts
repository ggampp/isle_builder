import * as THREE from 'three';
import { TILE_SIZE } from '../world/constants.ts';
import type { PreviewTile } from '../tools/toolsystem.ts';
import { toWorld3 } from '../core/world3d.ts';

/** Renderiza os fantasmas (previews) das ferramentas de desenho no plano XZ. */
export class PreviewRenderer {
  readonly group = new THREE.Group();
  private mesh: THREE.InstancedMesh;
  private readonly geometry: THREE.PlaneGeometry;
  private readonly material: THREE.MeshBasicMaterial;

  constructor() {
    this.geometry = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, 10000);
    this.mesh.count = 0;
    this.mesh.renderOrder = 6;
    this.group.add(this.mesh);
  }

  update(tiles: PreviewTile[]): void {
    if (tiles.length === 0) {
      this.mesh.count = 0;
      return;
    }

    const count = Math.min(tiles.length, this.mesh.instanceMatrix.count);
    this.mesh.count = count;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const tile = tiles[i]!;
      dummy.position.copy(
        toWorld3(
          tile.x * TILE_SIZE + TILE_SIZE / 2,
          tile.y * TILE_SIZE + TILE_SIZE / 2,
          0.08,
        ),
      );
      // Plano default (XY) → deita no chão XZ.
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
