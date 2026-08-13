import * as THREE from 'three';
import { GAZEBO } from '../voxels/saloon.ts';

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  return renderer;
}

export function createLighting(scene: THREE.Scene): {
  sun: THREE.DirectionalLight;
  lanterns: THREE.PointLight[];
  muzzle: THREE.PointLight;
} {
  scene.background = new THREE.Color(0xb9cfe0);
  scene.fog = new THREE.Fog(0xc5d6e6, 18, 62);

  const hemi = new THREE.HemisphereLight(0xe8f2ff, 0xc4a574, 0.72);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d0, 1.55);
  sun.position.set(12, 22, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 70;
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0x9bb7d4, 0.28);
  fill.position.set(-10, 6, -8);
  scene.add(fill);

  const lanterns: THREE.PointLight[] = [];
  for (let i = 0; i < 4; i++) {
    const light = new THREE.PointLight(0xffb45a, 1.15, 6.5, 1.8);
    light.castShadow = false;
    scene.add(light);
    lanterns.push(light);
  }

  const muzzle = new THREE.PointLight(0xffe6a0, 0, 4.5, 2);
  scene.add(muzzle);
  return { sun, lanterns, muzzle };
}

export function createWorldKit(
  scene: THREE.Scene,
  textures: Record<string, THREE.Texture>,
): void {
  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xd7c09a,
    map: textures.sand,
    roughness: 0.96,
    metalness: 0,
  });
  textures.sand.repeat.set(18, 18);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(28, 48), sandMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'sand';
  scene.add(ground);

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x9a6a3e,
    map: textures.wood,
    roughness: 0.86,
    metalness: 0.04,
  });
  textures.wood.repeat.set(6, 6);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.6, 0.18, 32), woodMat);
  deck.position.y = 0.09;
  deck.castShadow = true;
  deck.receiveShadow = true;
  deck.name = 'deck';
  scene.add(deck);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(3.52, 0.07, 8, 40), woodMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.18;
  rim.castShadow = true;
  scene.add(rim);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x8a7a68,
    map: textures.adobe,
    roughness: 0.94,
    metalness: 0.02,
  });
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(GAZEBO.radius, GAZEBO.radius + 0.08, 0.16, 24), stoneMat);
  plaza.position.set(GAZEBO.x, 0.08, GAZEBO.z);
  plaza.castShadow = true;
  plaza.receiveShadow = true;
  plaza.name = 'plaza';
  scene.add(plaza);

  if (textures.sky) {
    const skyMat = new THREE.MeshBasicMaterial({ map: textures.sky, side: THREE.BackSide, depthWrite: false });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 24, 16), skyMat);
    sky.name = 'sky';
    scene.add(sky);
  }
}
