import * as THREE from 'three';
import { CHUNK_SIZE, TILE_SIZE } from '../world/constants.ts';
import { chunkKey } from '../world/tilemap.ts';
import type { CoastManager } from '../world/coast.ts';
import type { Tilemap } from '../world/tilemap.ts';
import { DecorationKind } from '../world/coast.ts';
import { getPropDefinition } from '../props/catalog.ts';
import type { PropAtlas } from './art/propsAtlas.ts';
import { createPropSpriteMaterial, disposePropSpriteMaterial, propFeetWorld, propWorldSize } from './art/propSpriteUtils.ts';
import { toWorld3 } from '../core/world3d.ts';
import { clonePropModel, hasPropModel } from './propModels.ts';

const DECO_PROP_BY_KIND: Record<number, string> = {
  [DecorationKind.CoralPink]: 'coral_piece',
  [DecorationKind.CoralOrange]: 'coral_piece',
  [DecorationKind.Algae]: 'fern',
  [DecorationKind.SandPatch]: 'pebble',
};

const SHALLOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vWorld;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorld = vec2(worldPos.x, -worldPos.z);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SHALLOW_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec2 vWorld;

  uniform float uTime;
  uniform vec3 uColorShallow;
  uniform vec3 uColorDeep;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    float n = valueNoise(vWorld * 0.08 + vec2(uTime * 0.02, uTime * 0.015));
    float ripple = 0.85 + n * 0.15;
    vec3 color = mix(uColorDeep, uColorShallow, ripple);
    gl_FragColor = vec4(color, 0.92);
  }
`;

const FOAM_FRAGMENT = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  varying vec2 vWorld;

  uniform float uTime;

  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  void main() {
    float wave = sin(vWorld.x * 0.35 + uTime * 2.5) * 0.5 + 0.5;
    float wave2 = sin(vWorld.y * 0.28 - uTime * 2.0) * 0.5 + 0.5;
    float foam = smoothstep(0.35, 0.85, wave * wave2);
    float edge = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
    edge *= smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    float alpha = foam * edge * 0.75;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

interface ChunkCoastMeshes {
  shallow: THREE.Mesh | null;
  foam: THREE.Mesh | null;
  decorations: THREE.Group | null;
}

/**
 * Água rasa / espuma / decorações no plano XZ (Y = altura).
 */
export class CoastRenderer {
  readonly group = new THREE.Group();

  private readonly coastManager: CoastManager;
  private readonly propsAtlas: PropAtlas;
  private readonly shallowMaterial: THREE.ShaderMaterial;
  private readonly foamMaterial: THREE.ShaderMaterial;
  private readonly meshesByChunk = new Map<string, ChunkCoastMeshes>();
  private time = 0;
  private foamEnabled = true;

  constructor(coastManager: CoastManager, propsAtlas: PropAtlas) {
    this.coastManager = coastManager;
    this.propsAtlas = propsAtlas;

    this.shallowMaterial = new THREE.ShaderMaterial({
      vertexShader: SHALLOW_VERTEX,
      fragmentShader: SHALLOW_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uColorShallow: { value: new THREE.Color('#4ecdc4') },
        uColorDeep: { value: new THREE.Color('#2a9d8f') },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });

    this.foamMaterial = new THREE.ShaderMaterial({
      vertexShader: SHALLOW_VERTEX,
      fragmentShader: FOAM_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    });
  }

  update(dt: number): void {
    this.time += dt;
    this.shallowMaterial.uniforms['uTime'].value = this.time;
    this.foamMaterial.uniforms['uTime'].value = this.time;
  }

  setFoamEnabled(enabled: boolean): void {
    if (this.foamEnabled === enabled) return;
    this.foamEnabled = enabled;
    for (const meshes of this.meshesByChunk.values()) {
      if (meshes.foam) meshes.foam.visible = enabled;
    }
  }

  rebuildDirty(): void {
    const keys = this.coastManager.rebuildDirty();
    for (const key of keys) {
      const [cxStr, cyStr] = key.split(',');
      this.rebuildChunk(Number(cxStr), Number(cyStr));
    }
  }

  reconcileChunks(tilemap: Tilemap): void {
    const activeKeys = new Set<string>();
    for (const chunk of tilemap.allChunks()) {
      activeKeys.add(chunkKey(chunk.cx, chunk.cy));
    }
    for (const key of [...this.meshesByChunk.keys()]) {
      if (activeKeys.has(key)) continue;
      const meshes = this.meshesByChunk.get(key)!;
      this.disposeMesh(meshes.shallow);
      this.disposeMesh(meshes.foam);
      this.disposeDecoGroup(meshes.decorations);
      this.meshesByChunk.delete(key);
    }
  }

  private rebuildChunk(cx: number, cy: number): void {
    const key = chunkKey(cx, cy);
    let meshes = this.meshesByChunk.get(key);
    if (!meshes) {
      meshes = { shallow: null, foam: null, decorations: null };
      this.meshesByChunk.set(key, meshes);
    }

    this.disposeMesh(meshes.shallow);
    this.disposeMesh(meshes.foam);
    this.disposeDecoGroup(meshes.decorations);
    meshes.shallow = null;
    meshes.foam = null;
    meshes.decorations = null;

    const baseX = cx * CHUNK_SIZE;
    const baseY = cy * CHUNK_SIZE;

    const shallowPositions: number[] = [];
    const shallowUvs: number[] = [];
    const shallowIndices: number[] = [];
    let shallowQuads = 0;

    const foamPositions: number[] = [];
    const foamUvs: number[] = [];
    const foamIndices: number[] = [];
    let foamQuads = 0;

    const decoEntries: { x: number; y: number; kind: number }[] = [];

    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const tileX = baseX + lx;
        const tileY = baseY + ly;
        const info = this.coastManager.getTileInfo(tileX, tileY);

        if (info.isShallow) {
          this.pushQuad(shallowPositions, shallowUvs, shallowIndices, shallowQuads, tileX, tileY, -0.04);
          shallowQuads++;

          if (info.hasFoam) {
            this.pushQuad(foamPositions, foamUvs, foamIndices, foamQuads, tileX, tileY, 0.02);
            foamQuads++;
          }
        }

        if (info.decoration !== DecorationKind.None) {
          decoEntries.push({ x: tileX, y: tileY, kind: info.decoration });
        }
      }
    }

    if (shallowQuads > 0) {
      meshes.shallow = this.buildMesh(shallowPositions, shallowUvs, shallowIndices, this.shallowMaterial, 0);
      this.group.add(meshes.shallow);
    }

    if (foamQuads > 0) {
      meshes.foam = this.buildMesh(foamPositions, foamUvs, foamIndices, this.foamMaterial, 0.5);
      meshes.foam.visible = this.foamEnabled;
      this.group.add(meshes.foam);
    }

    if (decoEntries.length > 0) {
      meshes.decorations = this.buildDecorations(decoEntries);
      this.group.add(meshes.decorations);
    }
  }

  private buildDecorations(entries: { x: number; y: number; kind: number }[]): THREE.Group {
    const group = new THREE.Group();
    group.renderOrder = 0.3;

    for (const e of entries) {
      const propId = DECO_PROP_BY_KIND[e.kind];
      const def = propId ? getPropDefinition(propId) : undefined;
      if (!def) continue;

      const feet = propFeetWorld(def, e.x, e.y);
      const pos = toWorld3(feet.x, feet.y, 0);
      const scale = e.kind === DecorationKind.CoralPink || e.kind === DecorationKind.CoralOrange ? 0.55 : 0.75;

      if (hasPropModel(def.id)) {
        const model = clonePropModel(def.id)!;
        model.position.copy(pos);
        model.scale.multiplyScalar(scale);
        model.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
        group.add(model);
        continue;
      }

      const { w, h } = propWorldSize(def);
      const geo = new THREE.PlaneGeometry(w * scale, h * scale);
      const mat = createPropSpriteMaterial(def, this.propsAtlas, {
        color:
          e.kind === DecorationKind.CoralPink
            ? 0xffaacc
            : e.kind === DecorationKind.CoralOrange
              ? 0xffcc88
              : 0xffffff,
        depthTest: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, pos.y + (h * scale) * 0.5, pos.z);
      mesh.castShadow = true;
      mesh.userData.billboard = true;
      group.add(mesh);
    }

    return group;
  }

  /** Faz billboards de decoração olharem para a câmera. */
  faceCamera(camera: THREE.Camera): void {
    for (const meshes of this.meshesByChunk.values()) {
      if (!meshes.decorations) continue;
      meshes.decorations.traverse((obj) => {
        if (obj.userData.billboard) obj.lookAt(camera.position);
      });
    }
  }

  private pushQuad(
    positions: number[],
    uvs: number[],
    indices: number[],
    quadIndex: number,
    tileX: number,
    tileY: number,
    height: number,
  ): void {
    const x0 = tileX * TILE_SIZE;
    const y0 = tileY * TILE_SIZE;
    const x1 = x0 + TILE_SIZE;
    const y1 = y0 + TILE_SIZE;
    const base = quadIndex * 4;
    // Plano XZ: lógico +Y → mundo −Z
    positions.push(
      x0, height, -y0,
      x1, height, -y0,
      x1, height, -y1,
      x0, height, -y1,
    );
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }

  private buildMesh(
    positions: number[],
    uvs: number[],
    indices: number[],
    material: THREE.Material,
    renderOrder: number,
  ): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = renderOrder;
    return mesh;
  }

  private disposeMesh(mesh: THREE.Mesh | null): void {
    if (!mesh) return;
    this.group.remove(mesh);
    mesh.geometry.dispose();
  }

  private disposeDecoGroup(group: THREE.Group | null): void {
    if (!group) return;
    this.group.remove(group);
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      // Só sprites locais — clones GLB compartilham geometria do cache.
      if (obj.userData.billboard) {
        obj.geometry.dispose();
        disposePropSpriteMaterial(obj.material as THREE.Material);
      }
    });
  }
}
