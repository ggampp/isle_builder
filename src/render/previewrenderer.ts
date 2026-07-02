import * as THREE from 'three';
import { TILE_SIZE } from '../world/constants.ts';
import type { PreviewTile } from '../tools/toolsystem.ts';

/** Renderiza os fantasmas (previews) das ferramentas de desenho. */
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
    
    // Max 10000 preview tiles should be more than enough
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, 10000);
    this.mesh.count = 0;
    this.mesh.position.z = 2; // Acima do terreno
    // Three.js ordena objetos transparentes por renderOrder ANTES de distância/Z
    // (ver WebGLRenderList.painterSortStable) — sem isso, o mesh de grama
    // (renderOrder=1 em TerrainRenderer) desenharia por cima do preview.
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
      const tile = tiles[i];
      dummy.position.set(
        tile.x * TILE_SIZE + TILE_SIZE / 2,
        tile.y * TILE_SIZE + TILE_SIZE / 2,
        0
      );
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
