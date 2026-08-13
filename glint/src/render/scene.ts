import * as THREE from 'three';

export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x9ec8e8, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}

export function createLighting(scene: THREE.Scene): {
  sun: THREE.DirectionalLight;
  spark: THREE.PointLight;
} {
  scene.fog = new THREE.Fog(0xb7d4ea, 18, 42);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x7aa24a, 1.05);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1c8, 2.15);
  sun.position.set(-14, 22, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 60;
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18;
  sun.shadow.camera.bottom = -18;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0x8eb8e0, 0.28);
  fill.position.set(12, 6, 10);
  scene.add(fill);

  const spark = new THREE.PointLight(0xfff4a8, 0, 6, 2);
  spark.position.set(0, 1.2, 0);
  scene.add(spark);

  return { sun, spark };
}

export function resizeRenderer(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera,
): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
