import * as THREE from 'three';
import type { Chunk, Tilemap } from '../world/tilemap.ts';
import { chunkKey } from '../world/tilemap.ts';
import { TerrainLayer } from '../world/layers.ts';
import { buildLayerGeometry } from './chunkmesh.ts';
import { generateTerrainAtlasTexture, TerrainColors } from './art/terrainAtlas.ts';

interface ChunkMeshes {
  sand: THREE.Mesh | null;
  grass: THREE.Mesh | null;
  path: THREE.Mesh | null;
  bridge: THREE.Mesh | null;
  bridgeShadow: THREE.Mesh | null;
  cliff: THREE.Mesh | null;
}

/**
 * Dono dos meshes de terreno (sand/grass/path/bridge/cliff por chunk).
 */
export class TerrainRenderer {
  readonly group = new THREE.Group();

  private readonly tilemap: Tilemap;
  private readonly sandMaterial: THREE.MeshBasicMaterial;
  private readonly grassMaterial: THREE.MeshBasicMaterial;
  private readonly pathMaterial: THREE.MeshBasicMaterial;
  private readonly bridgeMaterial: THREE.MeshBasicMaterial;
  private readonly bridgeShadowMaterial: THREE.MeshBasicMaterial;
  private readonly cliffMaterial: THREE.MeshBasicMaterial;
  private readonly meshesByChunk = new Map<string, ChunkMeshes>();

  constructor(tilemap: Tilemap) {
    this.tilemap = tilemap;
    this.sandMaterial = new THREE.MeshBasicMaterial({
      map: generateTerrainAtlasTexture(TerrainColors.sand.base, TerrainColors.sand.dark, 'sand'),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.grassMaterial = new THREE.MeshBasicMaterial({
      map: generateTerrainAtlasTexture(TerrainColors.grass.base, TerrainColors.grass.dark, 'grass'),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.pathMaterial = new THREE.MeshBasicMaterial({
      map: generateTerrainAtlasTexture(TerrainColors.path.base, TerrainColors.path.dark, 'path'),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.bridgeMaterial = new THREE.MeshBasicMaterial({
      map: generateTerrainAtlasTexture(TerrainColors.bridge.base, TerrainColors.bridge.dark, 'bridge'),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.bridgeShadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a1a2e,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
      depthWrite: false,
    });
    this.cliffMaterial = new THREE.MeshBasicMaterial({
      map: generateTerrainAtlasTexture(TerrainColors.cliff.base, TerrainColors.cliff.dark, 'cliff'),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }

  rebuildDirtyChunks(): void {
    for (const chunk of this.tilemap.dirtyChunks()) {
      this.rebuildChunk(chunk);
      chunk.dirty = false;
    }
  }

  private rebuildChunk(chunk: Chunk): void {
    const key = chunkKey(chunk.cx, chunk.cy);
    let meshes = this.meshesByChunk.get(key);
    if (!meshes) {
      meshes = {
        sand: null,
        grass: null,
        path: null,
        bridge: null,
        bridgeShadow: null,
        cliff: null,
      };
      this.meshesByChunk.set(key, meshes);
    }

    meshes.sand = this.rebuildLayerMesh(meshes.sand, chunk, TerrainLayer.Sand, this.sandMaterial, 1);
    meshes.grass = this.rebuildLayerMesh(meshes.grass, chunk, TerrainLayer.Grass, this.grassMaterial, 2);
    meshes.path = this.rebuildLayerMesh(meshes.path, chunk, TerrainLayer.Path, this.pathMaterial, 3);
    meshes.bridgeShadow = this.rebuildBridgeShadow(meshes.bridgeShadow, chunk);
    meshes.bridge = this.rebuildLayerMesh(meshes.bridge, chunk, TerrainLayer.Bridge, this.bridgeMaterial, 4);
    meshes.cliff = this.rebuildLayerMesh(meshes.cliff, chunk, TerrainLayer.Cliff, this.cliffMaterial, 5);
  }

  private rebuildLayerMesh(
    existing: THREE.Mesh | null,
    chunk: Chunk,
    threshold: number,
    material: THREE.MeshBasicMaterial,
    renderOrder: number,
  ): THREE.Mesh | null {
    if (existing) {
      this.group.remove(existing);
      existing.geometry.dispose();
    }

    const geometry = buildLayerGeometry(this.tilemap, chunk, threshold);
    if (!geometry) return null;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = renderOrder;
    this.group.add(mesh);
    return mesh;
  }

  private rebuildBridgeShadow(existing: THREE.Mesh | null, chunk: Chunk): THREE.Mesh | null {
    if (existing) {
      this.group.remove(existing);
      existing.geometry.dispose();
    }

    const geometry = buildLayerGeometry(this.tilemap, chunk, TerrainLayer.Bridge);
    if (!geometry) return null;

    const pos = geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, -0.15);
    }
    pos.needsUpdate = true;

    const mesh = new THREE.Mesh(geometry, this.bridgeShadowMaterial);
    mesh.renderOrder = 0.8;
    this.group.add(mesh);
    return mesh;
  }
}
