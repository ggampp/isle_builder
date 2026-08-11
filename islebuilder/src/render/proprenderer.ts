import * as THREE from 'three';
import type { PropDefinition } from '../props/catalog.ts';
import { getPropDefinition } from '../props/catalog.ts';
import type { PropMap } from '../props/propmap.ts';
import { propSortY } from '../props/placement.ts';
import type { PropAtlas } from './art/propsAtlas.ts';
import { createPropSpriteMaterial, disposePropSpriteMaterial, propFeetWorld, propWorldSize } from './art/propSpriteUtils.ts';
import { Palette } from './art/palette.ts';

interface PropMeshes {
  shadow: THREE.Mesh;
  sprite: THREE.Mesh;
}

/**
 * Renders placed props with y-sort (renderOrder) and elliptical shadows.
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
      depthTest: false,
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

  private rebuildAll(): void {
    for (const meshes of this.meshes.values()) {
      this.group.remove(meshes.shadow, meshes.sprite);
      meshes.shadow.geometry.dispose();
      meshes.sprite.geometry.dispose();
      disposePropSpriteMaterial(meshes.sprite.material as THREE.Material);
    }
    this.meshes.clear();

    // Mundo +Y é Norte (para cima na tela, mais longe da câmera). Props mais
    // ao Sul (Y menor) devem desenhar por cima dos mais ao Norte quando os
    // sprites se sobrepõem — por isso a ordenação é DEScendente por Y: quem
    // tem Y maior (mais ao norte/longe) é desenhado primeiro (renderOrder
    // menor), e quem tem Y menor (mais ao sul/perto) é desenhado por último
    // (renderOrder maior, fica por cima). Achado invertido na validação da
    // Sprint 05 — duas construções sobrepostas renderizavam na ordem errada.
    const sorted = [...this.propMap.all()].sort((a, b) => {
      const da = getPropDefinition(a.defId);
      const db = getPropDefinition(b.defId);
      if (!da || !db) return 0;
      return propSortY(db, b.tileY) - propSortY(da, a.tileY);
    });

    // renderOrder é normalizado num intervalo FIXO [10, 11.9], independente
    // de quantas props existem — um contador incremental sem teto (10, 11,
    // 12, 13...) colidiria com o renderOrder fixo das entidades (12, ver
    // entityrenderer.ts) e do preview de props (20, ver proppreviewrenderer.ts)
    // assim que houvesse props suficientes (achado na validação da Sprint 05:
    // com 17 props o renderOrder chegava a 27).
    const total = sorted.length;
    sorted.forEach((prop, i) => {
      const def = getPropDefinition(prop.defId);
      if (!def) return;
      const order = total > 1 ? 10 + (i / (total - 1)) * 1.9 : 10;
      this.createPropMeshes(prop, def, order);
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

    const spriteGeo = new THREE.PlaneGeometry(w, h);

    const spriteMat = createPropSpriteMaterial(def, this.atlas);
    const sprite = new THREE.Mesh(spriteGeo, spriteMat);
    sprite.position.set(feet.x, feet.y + h * 0.5, 0.5);
    if (prop.flip) sprite.scale.x = -1;
    sprite.renderOrder = renderOrder;

    // Sombra proporcional à largura VISUAL do sprite (não ao footprint) — com
    // sprites maiores que o footprint, a sombra antiga virava um risco minúsculo.
    const shadowW = w * def.shadowScale * 0.5;
    const shadowH = shadowW * 0.4;
    const shadowGeo = new THREE.PlaneGeometry(shadowW, shadowH);
    const shadow = new THREE.Mesh(shadowGeo, this.shadowMaterial);
    shadow.position.set(feet.x, feet.y + shadowH * 0.2, 0.2);
    shadow.renderOrder = renderOrder - 0.5;

    this.group.add(shadow, sprite);
    this.meshes.set(prop.uid, { shadow, sprite });
  }
}
