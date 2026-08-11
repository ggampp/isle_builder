import * as THREE from 'three';

const CAR_SPACING = 6.4;
const SMOKE_POOL = 36;

function lambert(color: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function box(w: number, h: number, d: number, color: string,
  x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  return mesh;
}

function wheels(parent: THREE.Group, count: number, spread: number): void {
  const geo = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 10);
  geo.rotateX(Math.PI / 2);
  const mat = lambert('#2b2b33');
  for (let i = 0; i < count; i++) {
    const x = -spread / 2 + (spread * i) / (count - 1);
    for (const side of [-0.85, 0.85]) {
      const w = new THREE.Mesh(geo, mat);
      w.position.set(x, 0.5, side);
      parent.add(w);
    }
  }
}

function buildLocomotive(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(4.6, 1.5, 1.9, '#2f66c4', 0, 1.5));          // caldeira
  g.add(box(1.9, 2.3, 2.1, '#274f96', -1.8, 2.0));       // cabine
  g.add(box(2.1, 0.5, 2.3, '#1d3a6e', -1.8, 3.25));      // teto
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.45, 1.1, 8), lambert('#22232b'));
  chimney.position.set(1.6, 2.7, 0);
  chimney.castShadow = true;
  g.add(chimney);
  g.add(box(0.9, 0.7, 1.4, '#e0a33c', 2.5, 1.2));        // frente/farol
  g.add(box(0.7, 0.6, 2.0, '#8a2f27', 2.9, 0.7));        // limpa-trilhos
  wheels(g, 3, 3.4);
  return g;
}

function buildWagon(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(4.6, 0.4, 1.9, '#6b4a2f', 0, 1.0));
  g.add(box(4.6, 1.1, 1.9, '#3a3a42', 0, 1.75));
  const inner = box(4.0, 0.3, 1.4, '#23232a', 0, 2.15);
  inner.castShadow = false;
  g.add(inner);
  wheels(g, 2, 3.0);
  return g;
}

/** Trem que percorre a curva por arc-length — nunca sai do trilho por construção. */
export class Train {
  readonly group = new THREE.Group();
  /** Velocidade em unidades de mundo/s (~escala: 1 u ≈ 1 m; 20 m/s ≈ 45 mph). */
  speed = 20;
  private curve: THREE.CatmullRomCurve3;
  private length: number;
  private s = 0;
  private cars: THREE.Group[] = [];
  private smoke: THREE.Mesh[] = [];
  private smokeAge: number[] = [];
  private smokeTimer = 0;

  constructor(curve: THREE.CatmullRomCurve3, wagonCount = 4) {
    this.curve = curve;
    this.length = curve.getLength();
    this.cars.push(buildLocomotive());
    for (let i = 0; i < wagonCount; i++) this.cars.push(buildWagon());
    for (const c of this.cars) this.group.add(c);

    const smokeGeo = new THREE.IcosahedronGeometry(0.55, 0);
    for (let i = 0; i < SMOKE_POOL; i++) {
      const m = new THREE.Mesh(smokeGeo, new THREE.MeshLambertMaterial({
        color: '#f4f0ea', transparent: true, opacity: 0,
      }));
      m.visible = false;
      this.smoke.push(m);
      this.smokeAge.push(Infinity);
      this.group.add(m);
    }
  }

  /** Posição da locomotiva no mundo (para o minimapa). */
  get headPosition(): THREE.Vector3 {
    return this.cars[0].position;
  }

  get speedMph(): number {
    return Math.round(this.speed * 2.237);
  }

  update(dt: number): void {
    this.s = (this.s + this.speed * dt) % this.length;

    for (let i = 0; i < this.cars.length; i++) {
      const u = ((this.s - i * CAR_SPACING) / this.length + 1) % 1;
      const p = this.curve.getPointAt(u);
      const t = this.curve.getTangentAt(u);
      const car = this.cars[i];
      car.position.copy(p);
      car.rotation.y = Math.atan2(t.x, t.z) - Math.PI / 2;
    }

    this.updateSmoke(dt);
  }

  private updateSmoke(dt: number): void {
    this.smokeTimer -= dt;
    if (this.smokeTimer <= 0) {
      this.smokeTimer = 0.14;
      const idx = this.smokeAge.indexOf(Infinity);
      const slot = idx >= 0 ? idx : 0;
      const loco = this.cars[0];
      const chimneyWorld = new THREE.Vector3(1.6, 3.4, 0)
        .applyEuler(loco.rotation).add(loco.position);
      const puff = this.smoke[slot];
      puff.position.copy(chimneyWorld);
      puff.scale.setScalar(0.6);
      puff.visible = true;
      this.smokeAge[slot] = 0;
    }
    for (let i = 0; i < this.smoke.length; i++) {
      if (this.smokeAge[i] === Infinity) continue;
      this.smokeAge[i] += dt;
      const age = this.smokeAge[i];
      const life = 2.2;
      if (age >= life) {
        this.smoke[i].visible = false;
        this.smokeAge[i] = Infinity;
        continue;
      }
      const t = age / life;
      const puff = this.smoke[i];
      puff.position.y += dt * (2.4 - t * 1.6);
      puff.position.x += dt * 0.4;
      puff.scale.setScalar(0.6 + t * 2.4);
      (puff.material as THREE.MeshLambertMaterial).opacity = 0.85 * (1 - t) * (1 - t);
    }
  }
}
