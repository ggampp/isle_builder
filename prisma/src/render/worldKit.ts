import * as THREE from 'three';
import { assetUrl, CELL } from './materials.ts';
import type { MaterialLibrary } from './materials.ts';
import type { ModelCatalog } from './models.ts';

export class WorldKit {
  readonly group = new THREE.Group();
  private sky: THREE.Mesh | null = null;
  private mats: MaterialLibrary;
  private models: ModelCatalog;

  constructor(mats: MaterialLibrary, models: ModelCatalog) {
    this.mats = mats;
    this.models = models;
    this.group.name = 'world';
  }

  build(boardWidth: number, boardHeight: number): void {
    this.group.clear();
    const spanX = boardWidth * CELL + 2.4;
    const spanZ = boardHeight * CELL + 2.4;

    const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 48), this.mats.marble);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.22;
    floor.receiveShadow = true;
    this.group.add(floor);

    const table = new THREE.Mesh(
      new THREE.BoxGeometry(spanX, 0.28, spanZ),
      this.mats.table,
    );
    table.position.y = -0.06;
    table.castShadow = true;
    table.receiveShadow = true;
    this.group.add(table);

    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(spanX + 0.28, 0.1, spanZ + 0.28),
      this.mats.goldTrim,
    );
    lip.position.y = 0.06;
    this.group.add(lip);

    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth * CELL + 0.2, 0.12, boardHeight * CELL + 0.2),
      this.mats.slate,
    );
    inset.position.y = 0.08;
    inset.receiveShadow = true;
    this.group.add(inset);

    const colOffX = spanX * 0.55;
    const colOffZ = spanZ * 0.55;
    const spots: [number, number][] = [
      [-colOffX, -colOffZ], [colOffX, -colOffZ],
      [-colOffX, colOffZ], [colOffX, colOffZ],
    ];
    for (const [x, z] of spots) {
      const col = this.models.clone('column');
      col.position.set(x, -0.22, z);
      this.group.add(col);
    }

    const lampSpots: [number, number][] = [
      [-spanX * 0.2, -spanZ * 0.62],
      [spanX * 0.28, -spanZ * 0.58],
    ];
    for (const [x, z] of lampSpots) {
      const lamp = this.models.clone('lamp');
      lamp.position.set(x, 2.15, z);
      this.group.add(lamp);
    }

    const plinthGeo = new THREE.CylinderGeometry(0.55, 0.62, 0.35, 10);
    const gemGeo = new THREE.OctahedronGeometry(0.18, 0);
    const gemMat = this.mats.glass;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const r = Math.max(spanX, spanZ) * 0.78;
      const p = new THREE.Mesh(plinthGeo, this.mats.obsidian);
      p.position.set(Math.cos(a) * r, -0.04, Math.sin(a) * r);
      p.castShadow = true;
      p.receiveShadow = true;
      this.group.add(p);
      const gem = new THREE.Mesh(gemGeo, gemMat);
      gem.position.set(Math.cos(a) * r, 0.38, Math.sin(a) * r);
      gem.castShadow = true;
      this.group.add(gem);
    }

    this.addSky();
  }

  private addSky(): void {
    const loader = new THREE.TextureLoader();
    const geo = new THREE.SphereGeometry(42, 32, 20);
    const mat = new THREE.MeshBasicMaterial({
      color: '#152038',
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.renderOrder = -1;
    this.group.add(this.sky);
    loader.load(assetUrl('assets/textures/sky.png'), (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      if (this.sky && this.sky.material instanceof THREE.MeshBasicMaterial) {
        this.sky.material.map = tex;
        this.sky.material.color.set('#ffffff');
        this.sky.material.needsUpdate = true;
      }
    });
  }
}
