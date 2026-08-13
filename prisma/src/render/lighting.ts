import * as THREE from 'three';

export class LightingRig {
  readonly group = new THREE.Group();
  readonly key: THREE.DirectionalLight;
  readonly fill: THREE.DirectionalLight;
  readonly rim: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;

  constructor() {
    this.group.name = 'lights';
    this.hemi = new THREE.HemisphereLight('#8aa4d6', '#1a1420', 0.42);
    this.key = new THREE.DirectionalLight('#fff1d6', 1.55);
    this.key.position.set(6.5, 11, 5.5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(512, 512);
    this.key.shadow.camera.near = 1;
    this.key.shadow.camera.far = 28;
    this.key.shadow.camera.left = -10;
    this.key.shadow.camera.right = 10;
    this.key.shadow.camera.top = 10;
    this.key.shadow.camera.bottom = -10;
    this.key.shadow.bias = -0.0004;
    this.fill = new THREE.DirectionalLight('#6f8cff', 0.35);
    this.fill.position.set(-7, 4, -3);
    this.rim = new THREE.DirectionalLight('#ffb07a', 0.45);
    this.rim.position.set(-2, 6, 8);
    this.group.add(this.hemi, this.key, this.fill, this.rim);
  }
}
