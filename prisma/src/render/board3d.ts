import * as THREE from 'three';
import { DIR_VECTORS } from '../puzzle/grid.ts';
import type { Placements, Puzzle } from '../puzzle/grid.ts';
import type { Simulation } from '../puzzle/simulate.ts';
import { BeamSystem } from './beams.ts';
import { LightingRig } from './lighting.ts';
import { CELL, MaterialLibrary, assetUrl, colorThree } from './materials.ts';
import { ModelCatalog } from './models.ts';
import { GameScene } from './scene.ts';
import { WorldKit } from './worldKit.ts';

export class Board3D {
  readonly scene: GameScene;
  readonly models: ModelCatalog;
  readonly mats: MaterialLibrary;
  private world: WorldKit;
  private lights: LightingRig;
  private beams: BeamSystem;
  private board = new THREE.Group();
  private pieces = new THREE.Group();
  private tiles: THREE.Object3D[] = [];
  private hoverMesh: THREE.Mesh;
  private pieceLights: THREE.PointLight[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private puzzle: Puzzle | null = null;
  private dragging = false;
  private dragMoved = false;
  private lastX = 0;
  private lastY = 0;
  readonly ready: Promise<void>;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new GameScene(canvas);
    this.mats = new MaterialLibrary();
    this.models = new ModelCatalog(this.mats);
    this.world = new WorldKit(this.mats, this.models);
    this.lights = new LightingRig();
    this.beams = new BeamSystem(this.mats);
    this.hoverMesh = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.96, 0.04, CELL * 0.96), this.mats.hover);
    this.hoverMesh.visible = false;
    this.hoverMesh.position.y = 0.12;
    this.scene.scene.add(this.lights.group);
    this.scene.scene.add(this.world.group);
    this.scene.scene.add(this.board);
    this.board.add(this.pieces);
    this.board.add(this.beams.group);
    this.board.add(this.hoverMesh);
    this.bindInput(canvas);
    this.ready = this.boot();
  }

  private async boot(): Promise<void> {
    const texLoader = new THREE.TextureLoader();
    try {
      const slate = await texLoader.loadAsync(assetUrl('assets/textures/slate.png'));
      this.mats.applySlateMap(slate);
    } catch {
      // procedural slate color remains
    }
    await Promise.race([
      this.models.preload(),
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 10000);
      }),
    ]);
  }

  private bindInput(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.dragMoved = true;
      this.scene.orbit(dx, dy);
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });
    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.dragMoved = false;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', () => {
      this.dragging = false;
    });
    canvas.addEventListener('pointercancel', () => {
      this.dragging = false;
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scene.zoom(e.deltaY);
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', () => this.scene.resize());
  }

  didDrag(): boolean {
    return this.dragMoved;
  }

  cellToWorld(index: number): { x: number; z: number } {
    const puzzle = this.puzzle;
    if (!puzzle) return { x: 0, z: 0 };
    const x = index % puzzle.width;
    const y = Math.floor(index / puzzle.width);
    return {
      x: (x - (puzzle.width - 1) / 2) * CELL,
      z: (y - (puzzle.height - 1) / 2) * CELL,
    };
  }

  rebuild(puzzle: Puzzle): void {
    this.puzzle = puzzle;
    this.world.build(puzzle.width, puzzle.height);
    this.pieces.clear();
    this.tiles = [];
    for (const light of this.pieceLights) this.board.remove(light);
    this.pieceLights = [];
    for (let i = 0; i < puzzle.cells.length; i++) {
      const { x, z } = this.cellToWorld(i);
      const tile = this.models.clone('tile');
      tile.position.set(x, 0, z);
      tile.userData.index = i;
      this.pieces.add(tile);
      this.tiles.push(tile);
    }
    this.scene.distance = 8.4 + puzzle.width * 0.42;
  }

  sync(puzzle: Puzzle, placements: Placements, sim: Simulation, hover: number | null): void {
    this.puzzle = puzzle;
    const keep = new Set<THREE.Object3D>();
    puzzle.cells.forEach((cell, index) => {
      const { x, z } = this.cellToWorld(index);
      if (cell.kind === 'wall') {
        keep.add(this.ensurePiece(index, 'wall', x, z));
      } else if (cell.kind === 'emitter') {
        const piece = this.ensurePiece(index, 'emitter', x, z);
        const v = DIR_VECTORS[cell.dir];
        piece.rotation.y = Math.atan2(v.dx, v.dy);
        this.tintGlass(piece, cell.color);
        this.markLight(index, x, z, cell.color, 1.4);
        keep.add(piece);
      } else if (cell.kind === 'target') {
        const piece = this.ensurePiece(index, 'target', x, z);
        const lit = sim.lit.has(index);
        const wrong = sim.wrong.has(index);
        const shown = lit ? cell.want : (wrong ? sim.atCell[index] : cell.want);
        this.tintGlass(piece, shown);
        this.markLight(index, x, z, shown, lit ? 1.8 : (wrong ? 0.7 : 0.35));
        piece.scale.setScalar(lit ? 1.08 : 1);
        keep.add(piece);
      }
      const mirror = placements.get(index);
      if (mirror) {
        const piece = this.ensurePiece(index, `mirror:${mirror}`, x, z, 'mirror');
        piece.rotation.y = mirror === 'slash' ? Math.PI / 4 : -Math.PI / 4;
        keep.add(piece);
      }
    });
    for (const child of [...this.pieces.children]) {
      if (child.userData.piece && !keep.has(child) && !this.tiles.includes(child)) {
        this.pieces.remove(child);
      }
    }
    this.beams.sync(puzzle, sim, (i) => this.cellToWorld(i));
    if (hover !== null && puzzle.cells[hover]?.kind === 'empty') {
      const { x, z } = this.cellToWorld(hover);
      this.hoverMesh.visible = true;
      this.hoverMesh.position.set(x, 0.12, z);
    } else {
      this.hoverMesh.visible = false;
    }
  }

  private ensurePiece(index: number, key: string, x: number, z: number, kind?: 'wall' | 'emitter' | 'target' | 'mirror'): THREE.Object3D {
    const existing = this.pieces.children.find((c) => c.userData.piece === key && c.userData.index === index);
    if (existing) {
      existing.position.x = x;
      existing.position.z = z;
      return existing;
    }
    const modelKind = kind ?? (key as 'wall' | 'emitter' | 'target' | 'mirror');
    const root = this.models.clone(modelKind);
    root.userData.piece = key;
    root.userData.index = index;
    root.position.set(x, 0.08, z);
    this.pieces.add(root);
    return root;
  }

  private tintGlass(root: THREE.Object3D, mask: number): void {
    const color = colorThree(mask);
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat || !('emissive' in mat)) continue;
        const std = mat as THREE.MeshStandardMaterial;
        const isGlass = std.transparent || ('transmission' in std && (std as THREE.MeshPhysicalMaterial).transmission > 0);
        if (!isGlass && std.metalness > 0.4 && std.roughness < 0.45) continue;
        if (isGlass || std.roughness > 0.5 || std.emissiveIntensity > 0.01) {
          std.emissive = color;
          std.emissiveIntensity = isGlass ? 1.1 : 0.45;
        }
      }
    });
  }

  private markLight(index: number, x: number, z: number, mask: number, intensity: number): void {
    let light = this.pieceLights.find((l) => l.userData.index === index);
    if (!light) {
      light = new THREE.PointLight('#ffffff', intensity, 2.4, 2);
      light.userData.index = index;
      this.board.add(light);
      this.pieceLights.push(light);
    }
    light.color.copy(colorThree(mask));
    light.intensity = intensity;
    light.position.set(x, 0.55, z);
    light.visible = intensity > 0.05;
  }

  pickCell(): number | null {
    if (!this.puzzle) return null;
    this.raycaster.setFromCamera(this.pointer, this.scene.camera);
    const hits = this.raycaster.intersectObjects(this.tiles, true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0].object;
    while (obj) {
      if (typeof obj.userData.index === 'number') return obj.userData.index as number;
      obj = obj.parent;
    }
    return null;
  }

  hoverCell(): number | null {
    return this.pickCell();
  }

  update(dt: number, time: number, _solved: boolean): void {
    this.beams.pulse(time);
    this.scene.render(time);
    void dt;
  }

}

