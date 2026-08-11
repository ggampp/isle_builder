import * as THREE from 'three';
import { GameLoop } from './core/loop.ts';
import { InputManager } from './core/input.ts';
import { CanyonCamera } from './core/camera.ts';
import { buildTerrain, buildWater } from './world/terrain.ts';
import { buildScatter } from './world/scatter.ts';
import { buildTrackCurve, buildTrackMesh, sampleTrack } from './rail/track.ts';
import { Train } from './rail/train.ts';
import { Hud } from './ui/hud.ts';

const app = document.getElementById('app');
if (!app) throw new Error('#app não encontrado');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f2c48f');
scene.fog = new THREE.Fog('#f2c48f', 260, 560);

const hemi = new THREE.HemisphereLight('#fff4e0', '#c98a5a', 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d6', 1.6);
sun.position.set(120, 180, 60);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -240;
sun.shadow.camera.right = 240;
sun.shadow.camera.top = 240;
sun.shadow.camera.bottom = -240;
sun.shadow.camera.far = 600;
sun.shadow.bias = -0.0005;
scene.add(sun);

scene.add(buildTerrain());
scene.add(buildWater());

const curve = buildTrackCurve();
scene.add(buildTrackMesh(curve));
const { points: trackPoints } = sampleTrack(curve, 4);
scene.add(buildScatter(trackPoints));

const train = new Train(curve, 4);
scene.add(train.group);

const input = new InputManager(renderer.domElement);
const camera = new CanyonCamera(window.innerWidth / window.innerHeight);
const hud = new Hud(document.body);
hud.minimap.setTrack(trackPoints);
hud.toast('Bem-vindo ao Canyon Rails! Fatia vertical — Sprint 01');

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.resize(window.innerWidth / window.innerHeight);
});

let hudTimer = 0;
const loop = new GameLoop((dt) => {
  camera.update(dt, input);
  train.update(dt);
  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = 0.25;
    hud.setSpeed(train.speedMph);
    hud.minimap.update(train.headPosition);
  }
  renderer.render(scene, camera.camera);
});
loop.start();
