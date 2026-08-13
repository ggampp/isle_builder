import * as THREE from 'three';
import type { Chunk, Tilemap } from '../world/tilemap.ts';
import { chunkKey } from '../world/tilemap.ts';
import { TerrainLayer } from '../world/layers.ts';
import { buildLayerGeometry, type LayerGeometryOptions } from './chunkmesh.ts';
import { generateTerrainAtlasTexture, TerrainColors } from './art/terrainAtlas.ts';
import sandFillUrl from '../../assets/status/textura_areia.png?url';
import grassFillUrl from '../../assets/status/textura_grama.png?url';
import wetSandFillUrl from '../../assets/status/textura_areia_molhada.png?url';
import { terrainFillWorldScale } from './art/worldScale.ts';

const TERRAIN_VERTEX = /* glsl */ `
  attribute float aWet;

  varying vec2 vUv;
  varying vec2 vWorld;
  varying float vWet;

  void main() {
    vUv = uv;
    vWet = aWet;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    // Plano lógico: x = world.x, y = -world.z
    vWorld = vec2(worldPos.x, -worldPos.z);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const TERRAIN_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec2 vWorld;
  varying float vWet;

  uniform sampler2D uMap;
  uniform sampler2D uFillMap;
  uniform sampler2D uWetFillMap;
  uniform vec2 uFillScale;
  uniform float uUseFillMap;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.01) discard;

    vec2 fillUv = vec2(vWorld.x / uFillScale.x, vWorld.y / uFillScale.y);
    vec3 imageFill = texture2D(uFillMap, fillUv).rgb;
    // vWet interpola por vértice: 1 na linha d'água, 0 terra adentro.
    // Geometrias sem o atributo aWet leem 0 (atributo desabilitado) = seco.
    vec3 wetFill = texture2D(uWetFillMap, fillUv).rgb;
    vec3 fill = mix(imageFill, wetFill, vWet);
    vec3 color = mix(tex.rgb, fill, uUseFillMap);
    gl_FragColor = vec4(color, tex.a);
  }
`;

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
  private readonly sandMaterial: THREE.ShaderMaterial;
  private readonly grassMaterial: THREE.ShaderMaterial;
  private readonly pathMaterial: THREE.ShaderMaterial;
  private readonly bridgeMaterial: THREE.ShaderMaterial;
  private readonly bridgeShadowMaterial: THREE.MeshBasicMaterial;
  private readonly cliffMaterial: THREE.ShaderMaterial;
  private readonly meshesByChunk = new Map<string, ChunkMeshes>();

  constructor(tilemap: Tilemap) {
    this.tilemap = tilemap;
    const defaultFillScale = new THREE.Vector2(512, 512);
    const sandFill = this.loadRepeatingTexture(sandFillUrl);
    const grassFill = this.loadRepeatingTexture(grassFillUrl);
    const wetSandFill = this.loadRepeatingTexture(wetSandFillUrl);
    this.sandMaterial = this.createTerrainMaterial('sand', sandFill, defaultFillScale, wetSandFill);
    this.grassMaterial = this.createTerrainMaterial('grass', grassFill, defaultFillScale);
    this.bindFillScale(sandFillUrl, this.sandMaterial);
    this.bindFillScale(grassFillUrl, this.grassMaterial);
    this.pathMaterial = this.createTerrainMaterial('path');
    this.bridgeMaterial = this.createTerrainMaterial('bridge');
    this.bridgeShadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a1a2e,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
      depthWrite: false,
    });
    this.cliffMaterial = this.createTerrainMaterial('cliff');
  }

  private createTerrainMaterial(
    kind: keyof typeof TerrainColors,
    fillTexture?: THREE.Texture,
    fillScale = new THREE.Vector2(1, 1),
    wetFillTexture?: THREE.Texture,
  ): THREE.ShaderMaterial {
    const colors = TerrainColors[kind];
    const texture = generateTerrainAtlasTexture(colors.base, colors.dark, kind);
    return new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERTEX,
      fragmentShader: TERRAIN_FRAGMENT,
      uniforms: {
        uMap: { value: texture },
        uFillMap: { value: fillTexture ?? texture },
        uWetFillMap: { value: wetFillTexture ?? fillTexture ?? texture },
        uFillScale: { value: fillScale },
        uUseFillMap: { value: fillTexture ? 1 : 0 },
      },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }

  private loadRepeatingTexture(url: string): THREE.Texture {
    const texture = new THREE.TextureLoader().load(url);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private bindFillScale(url: string, material: THREE.ShaderMaterial): void {
    new THREE.TextureLoader().load(url, (tex) => {
      const img = tex.image as HTMLImageElement;
      const scale = terrainFillWorldScale(img.naturalWidth, img.naturalHeight);
      material.uniforms.uFillScale.value.set(scale.x, scale.y);
      tex.dispose();
    });
  }

  rebuildDirtyChunks(): void {
    for (const chunk of this.tilemap.dirtyChunks()) {
      this.rebuildChunk(chunk);
      chunk.dirty = false;
    }
  }

  /** Remove meshes de chunks que não existem mais no tilemap (ex.: após limpar o mapa). */
  reconcileChunks(): void {
    const activeKeys = new Set<string>();
    for (const chunk of this.tilemap.allChunks()) {
      activeKeys.add(chunkKey(chunk.cx, chunk.cy));
    }
    for (const key of [...this.meshesByChunk.keys()]) {
      if (activeKeys.has(key)) continue;
      this.disposeChunkMeshes(key);
      this.meshesByChunk.delete(key);
    }
  }

  private disposeChunkMeshes(key: string): void {
    const meshes = this.meshesByChunk.get(key);
    if (!meshes) return;
    for (const mesh of [
      meshes.sand,
      meshes.grass,
      meshes.path,
      meshes.bridge,
      meshes.bridgeShadow,
      meshes.cliff,
    ]) {
      if (!mesh) continue;
      this.group.remove(mesh);
      mesh.geometry.dispose();
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

    meshes.sand = this.rebuildLayerMesh(meshes.sand, chunk, TerrainLayer.Sand, this.sandMaterial, 1, {
      shoreWetness: true,
    });
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
    material: THREE.Material,
    renderOrder: number,
    options?: LayerGeometryOptions,
  ): THREE.Mesh | null {
    if (existing) {
      this.group.remove(existing);
      existing.geometry.dispose();
    }

    const geometry = buildLayerGeometry(this.tilemap, chunk, threshold, options);
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
      // Sombra logo abaixo do deck (eixo Y = cima).
      pos.setY(i, -0.12);
    }
    pos.needsUpdate = true;

    const mesh = new THREE.Mesh(geometry, this.bridgeShadowMaterial);
    mesh.renderOrder = 0.8;
    this.group.add(mesh);
    return mesh;
  }
}
