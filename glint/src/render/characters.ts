import * as THREE from 'three';

export interface CharacterView {
  root: THREE.Group;
  face: (x: number, z: number) => void;
  animate: (time: number, movement: number) => void;
  flash: (active: boolean) => void;
}

type MaterialEntry = {
  material: THREE.MeshStandardMaterial;
  color: number;
  emissive: number;
};

function material(color: number, roughness = 0.72, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function mesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  mat: THREE.MeshStandardMaterial,
  name: string,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const part = new THREE.Mesh(geometry, mat);
  part.name = name;
  part.position.set(x, y, z);
  part.castShadow = true;
  part.receiveShadow = true;
  group.add(part);
  return part;
}

function shadow(group: THREE.Group, radius: number): void {
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({ color: 0x17251b, transparent: true, opacity: 0.24, depthWrite: false }),
  );
  disc.name = 'ground-shadow';
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.018;
  disc.scale.z = 0.62;
  group.add(disc);
}

function finish(
  root: THREE.Group,
  entries: MaterialEntry[],
  animate: (time: number, movement: number) => void,
): CharacterView {
  return {
    root,
    face: (x, z) => {
      if (Math.hypot(x, z) > 0.02) root.rotation.y = Math.atan2(x, z);
    },
    animate,
    flash: (active) => {
      for (const entry of entries) {
        entry.material.color.setHex(active ? 0xffb29b : entry.color);
        entry.material.emissive.setHex(active ? 0x3b0800 : entry.emissive);
      }
    },
  };
}

export function createHeroModel(): CharacterView {
  const root = new THREE.Group();
  root.name = 'hero-model';
  shadow(root, 0.42);
  const leather = material(0x342638);
  const cloth = material(0x365d91);
  const steel = material(0xc5d1dd, 0.28, 0.78);
  const gold = material(0xe1b953, 0.34, 0.64);
  const skin = material(0xeac09a);
  const hair = material(0x7c452b);
  const entries = [leather, cloth, steel, gold, skin, hair].map((mat) => ({
    material: mat,
    color: mat.color.getHex(),
    emissive: mat.emissive.getHex(),
  }));

  const legGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.5, 6);
  const bootGeo = new THREE.BoxGeometry(0.22, 0.12, 0.3);
  mesh(root, legGeo, cloth, 'left-leg', -0.13, 0.43, 0);
  mesh(root, legGeo, cloth, 'right-leg', 0.13, 0.43, 0);
  mesh(root, bootGeo, leather, 'left-boot', -0.13, 0.16, 0.05);
  mesh(root, bootGeo, leather, 'right-boot', 0.13, 0.16, 0.05);

  const cloak = mesh(root, new THREE.CylinderGeometry(0.25, 0.38, 0.72, 7), cloth, 'blue-cloak', 0, 0.82, -0.04);
  cloak.scale.z = 0.72;
  mesh(root, new THREE.TorusGeometry(0.27, 0.04, 5, 10), gold, 'belt', 0, 0.68, 0).rotation.x = Math.PI / 2;
  mesh(root, new THREE.SphereGeometry(0.27, 10, 8), steel, 'armored-shoulders', 0, 1.14, 0).scale.set(1.25, 0.62, 0.78);
  mesh(root, new THREE.SphereGeometry(0.21, 10, 8), skin, 'hero-head', 0, 1.43, 0.02);
  const fringe = mesh(root, new THREE.SphereGeometry(0.225, 10, 7), hair, 'hair-and-ponytail', 0, 1.54, -0.04);
  fringe.scale.set(1.03, 0.48, 1.02);
  mesh(root, new THREE.SphereGeometry(0.11, 8, 6), hair, 'ponytail', 0, 1.39, -0.21);
  mesh(root, new THREE.SphereGeometry(0.035, 6, 4), steel, 'left-eye-glint', -0.075, 1.45, 0.19);
  mesh(root, new THREE.SphereGeometry(0.035, 6, 4), steel, 'right-eye-glint', 0.075, 1.45, 0.19);

  const armGeo = new THREE.CylinderGeometry(0.085, 0.11, 0.48, 6);
  const leftArm = mesh(root, armGeo, steel, 'shield-arm', -0.34, 1.02, 0.03);
  leftArm.rotation.z = 0.35;
  const shield = mesh(root, new THREE.CylinderGeometry(0.22, 0.22, 0.055, 8), gold, 'kite-shield', -0.43, 1.01, 0.12);
  shield.rotation.x = Math.PI / 2;
  const rightArm = mesh(root, armGeo, steel, 'sword-arm', 0.34, 1.03, 0.03);
  rightArm.rotation.z = -0.48;
  const blade = mesh(root, new THREE.BoxGeometry(0.07, 0.66, 0.08), steel, 'sword-blade', 0.51, 1.2, 0.08);
  blade.rotation.z = -0.34;
  const hilt = mesh(root, new THREE.BoxGeometry(0.24, 0.05, 0.09), gold, 'sword-hilt', 0.4, 0.93, 0.08);
  hilt.rotation.z = -0.34;

  return finish(root, entries, (time, movement) => {
    const stride = Math.sin(time * 10) * Math.min(1, movement * 7);
    cloak.position.y = 0.82 + Math.abs(stride) * 0.025;
    leftArm.rotation.z = 0.35 - stride * 0.18;
    rightArm.rotation.z = -0.48 + stride * 0.22;
    blade.rotation.z = -0.34 + stride * 0.08;
  });
}

export function createSlimeModel(ghost = false): CharacterView {
  const root = new THREE.Group();
  root.name = ghost ? 'ghost-slime-model' : 'slime-model';
  shadow(root, 0.35);
  const body = material(ghost ? 0x8dd9d5 : 0x5ebd5a, 0.38, 0.05);
  body.transparent = ghost;
  body.opacity = ghost ? 0.78 : 1;
  const belly = material(ghost ? 0xc6fff5 : 0x9be77b, 0.5);
  const eye = material(0x13243a, 0.25, 0.12);
  const glow = material(ghost ? 0x9af7f0 : 0xffd45f, 0.24, 0.15);
  glow.emissive.setHex(ghost ? 0x1d7674 : 0x6b3c00);
  const entries = [body, belly, eye, glow].map((mat) => ({ material: mat, color: mat.color.getHex(), emissive: mat.emissive.getHex() }));

  const bodyMesh = mesh(root, new THREE.SphereGeometry(0.42, 12, 8), body, 'slime-body', 0, 0.4, 0);
  bodyMesh.scale.set(1, 0.8, 0.9);
  const bellyMesh = mesh(root, new THREE.SphereGeometry(0.27, 10, 7), belly, 'slime-belly', 0, 0.34, 0.3);
  bellyMesh.scale.set(1, 0.72, 0.3);
  mesh(root, new THREE.SphereGeometry(0.055, 7, 5), eye, 'left-eye', -0.13, 0.49, 0.34);
  mesh(root, new THREE.SphereGeometry(0.055, 7, 5), eye, 'right-eye', 0.13, 0.49, 0.34);
  const crown = mesh(root, new THREE.ConeGeometry(0.11, 0.23, 5), glow, ghost ? 'spectral-flame' : 'slime-crown', 0, 0.88, 0);
  crown.rotation.z = ghost ? 0.18 : 0;
  if (ghost) {
    for (const x of [-0.22, 0.22]) {
      const wisp = mesh(root, new THREE.ConeGeometry(0.08, 0.3, 5), glow, 'ghost-wisp', x, 0.72, -0.06);
      wisp.rotation.z = x * 1.2;
    }
  }

  return finish(root, entries, (time, movement) => {
    const pulse = 1 + Math.sin(time * 5 + (ghost ? 1.4 : 0)) * 0.055;
    bodyMesh.scale.set(pulse, 0.8 / pulse, 0.9 * pulse);
    bellyMesh.scale.set(pulse, 0.72 / pulse, 0.3);
    bodyMesh.position.y = 0.4 + Math.abs(Math.sin(time * 4)) * movement * 0.035;
    bellyMesh.position.y = 0.34 + Math.abs(Math.sin(time * 4)) * movement * 0.025;
    crown.rotation.z = ghost ? Math.sin(time * 3) * 0.24 : Math.sin(time * 4) * 0.06;
  });
}

export function createGolemModel(): CharacterView {
  const root = new THREE.Group();
  root.name = 'rune-golem-model';
  shadow(root, 0.58);
  const rock = material(0x5c5e68, 0.92);
  const moss = material(0x557a47, 0.86);
  const rune = material(0x70e2e8, 0.28, 0.1);
  rune.emissive.setHex(0x187f8d);
  const dark = material(0x2e3139, 0.85);
  const entries = [rock, moss, rune, dark].map((mat) => ({ material: mat, color: mat.color.getHex(), emissive: mat.emissive.getHex() }));

  const torso = mesh(root, new THREE.DodecahedronGeometry(0.5, 0), rock, 'golem-torso', 0, 0.78, 0);
  torso.scale.set(1, 1.12, 0.75);
  const head = mesh(root, new THREE.DodecahedronGeometry(0.36, 0), rock, 'golem-head', 0, 1.43, 0.04);
  head.scale.set(1.08, 0.85, 0.82);
  mesh(root, new THREE.BoxGeometry(0.28, 0.09, 0.04), rune, 'rune-chest', 0, 0.85, 0.39);
  mesh(root, new THREE.SphereGeometry(0.06, 7, 5), rune, 'left-rune-eye', -0.13, 1.45, 0.3);
  mesh(root, new THREE.SphereGeometry(0.06, 7, 5), rune, 'right-rune-eye', 0.13, 1.45, 0.3);
  const armGeo = new THREE.DodecahedronGeometry(0.22, 0);
  const leftArm = mesh(root, armGeo, rock, 'left-boulder-arm', -0.55, 0.88, 0);
  const rightArm = mesh(root, armGeo, rock, 'right-boulder-arm', 0.55, 0.88, 0);
  const legGeo = new THREE.DodecahedronGeometry(0.22, 0);
  mesh(root, legGeo, dark, 'left-stone-leg', -0.22, 0.29, 0);
  mesh(root, legGeo, dark, 'right-stone-leg', 0.22, 0.29, 0);
  const mossPatch = mesh(root, new THREE.SphereGeometry(0.19, 7, 5), moss, 'moss-cap', -0.14, 1.72, -0.03);
  mossPatch.scale.set(1.2, 0.4, 0.9);

  return finish(root, entries, (time, movement) => {
    const swing = Math.sin(time * 2.5) * (0.08 + movement * 0.25);
    leftArm.rotation.z = swing;
    rightArm.rotation.z = -swing;
    torso.rotation.y = Math.sin(time * 1.2) * 0.035;
    head.rotation.y = Math.sin(time * 0.9) * 0.08;
    torso.position.y = 0.78 + Math.abs(Math.sin(time * 2.5)) * movement * 0.025;
  });
}
