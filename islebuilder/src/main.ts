import * as THREE from 'three';
import { GameLoop } from './core/loop.ts';
import { IsleCamera } from './core/camera.ts';
import { InputManager } from './core/input.ts';
import { DebugOverlay } from './core/debug.ts';
import { Ocean } from './render/ocean.ts';
import { Tilemap } from './world/tilemap.ts';
import { TerrainRenderer } from './render/terrainrenderer.ts';
import { CoastRenderer } from './render/coastrenderer.ts';
import { CoastManager } from './world/coast.ts';
import { PreviewRenderer } from './render/previewrenderer.ts';
import type { SideTab } from './ui/sidepanel.ts';
import type { ToolId } from './ui/toolbar.ts';
import { UIManager } from './ui/uimanager.ts';
import './ui/styles.css';
import { HistoryManager } from './tools/history.ts';
import { ToolSystem } from './tools/toolsystem.ts';
import type { Tool } from './tools/toolsystem.ts';
import { Brush } from './tools/brush.ts';
import { LineTool } from './tools/line.ts';
import { RectTool } from './tools/rect.ts';
import { BucketTool } from './tools/bucket.ts';
import { EraserTool } from './tools/eraser.ts';
import { DropperTool } from './tools/dropper.ts';
import { HandTool } from './tools/hand.ts';
import { showToast } from './ui/toast.ts';
import { PropMap } from './props/propmap.ts';
import { PropPlacementController } from './props/propplacement.ts';
import { buildPropsAtlas, invalidatePropsAtlasCache, loadPropsAtlasFromImage } from './render/art/propsAtlas.ts';
import { PropRenderer } from './render/proprenderer.ts';
import { PropPreviewRenderer } from './render/proppreviewrenderer.ts';
import { preloadPropModels } from './render/propModels.ts';
import { preloadEntityModels } from './render/entityModels.ts';
import { getPropDefinition } from './props/catalog.ts';
import { EntityManager } from './entities/manager.ts';
import { EntityRenderer } from './render/entityrenderer.ts';
import { buildEntityAtlas, invalidateEntityAtlasCache, loadEntityAtlasFromImage } from './render/entityAtlas.ts';
import { computeLandBounds } from './world/landBounds.ts';
import { TILE_SIZE } from './world/constants.ts';
import { loadSettings } from './ui/settingsModal.ts';
import { seedStarterIsland, seedStarterProps } from './world/seedIsland.ts';


const container = document.getElementById('app');
if (!container) {
  throw new Error('Elemento #app não encontrado em index.html');
}

if (import.meta.env.DEV) {
  invalidatePropsAtlasCache();
  invalidateEntityAtlasCache();
}

const initialSettings = loadSettings();
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, initialSettings.dpr));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x7ec8d8, 0.00045);

const hemi = new THREE.HemisphereLight(0xfff2dd, 0x3a6a7a, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6c0, 1.15);
sun.position.set(180, 260, 120);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 800;
sun.shadow.camera.left = -220;
sun.shadow.camera.right = 220;
sun.shadow.camera.top = 220;
sun.shadow.camera.bottom = -220;
scene.add(sun);

const isleCamera = new IsleCamera(window.innerWidth, window.innerHeight);
isleCamera.x = 0;
isleCamera.y = 0;
const input = new InputManager(renderer.domElement);
const ocean = new Ocean();
scene.add(ocean.mesh);

const tilemap = new Tilemap();
const propMap = new PropMap();
const coastManager = new CoastManager(tilemap);
const terrainRenderer = new TerrainRenderer(tilemap);
let coastRenderer: CoastRenderer;
let propRenderer: PropRenderer;
let propPreviewRenderer: PropPreviewRenderer;
const entityManager = new EntityManager(tilemap, coastManager);
let entityRenderer: EntityRenderer;

const previewRenderer = new PreviewRenderer();
scene.add(previewRenderer.group);

const history = new HistoryManager(tilemap, propMap);
history.chainTileCallback((x, y, oldLayer, newLayer) => {
  coastManager.onTileChanged(x, y, oldLayer, newLayer);
  entityManager.onTerrainChanged();
});
history.chainPropCallback(() => {
  propRenderer?.markDirty();
});

function syncRenderersAfterMapChange(): void {
  coastManager.invalidateAll();
  terrainRenderer.reconcileChunks();
  coastRenderer?.reconcileChunks(tilemap);
  propRenderer?.markDirty();
  entityManager.onTerrainChanged();
}

const toolSystem = new ToolSystem(history);
const propPlacement = new PropPlacementController(tilemap, propMap, history);

let currentLayer = 1;
let activeTab: SideTab = 'land';

const brush = new Brush(tilemap);
const line = new LineTool(tilemap);
const rect = new RectTool(tilemap);
const bucket = new BucketTool(tilemap, (limit) => {
  showToast(`Fill limit reached (${limit.toLocaleString()} tiles).`);
});
const eraser = new EraserTool(tilemap);
const hand = new HandTool();

let uiManager: UIManager;
const dropper = new DropperTool(tilemap, (layer) => {
  if (uiManager) uiManager.sidePanel.setLayer(layer);
});

const tools: Record<ToolId, Tool> = { brush, line, rect, bucket, eraser, dropper, hand };

uiManager = new UIManager({
  onTabChanged: (tab) => {
    activeTab = tab;
    if (tab === 'land') {
      propPlacement.setSelectedProp(null);
      propPreviewRenderer?.update(null, 0, 0, false);
    }
  },
  onPropSelected: (defId) => {
    propPlacement.setSelectedProp(defId);
  },
  onToolChanged: (toolId) => {
    toolSystem.setTool(tools[toolId]);
    input.setForcePan(toolId === 'hand');
    renderer.domElement.style.cursor = uiManager.toolbar.activeCursor;
  },
  onLayerChanged: (layer) => { currentLayer = layer; },
  onUndo: () => {
    history.undo();
    syncRenderersAfterMapChange();
  },
  onRedo: () => {
    history.redo();
    syncRenderersAfterMapChange();
  },
  onClear: () => {
    history.clearMap();
    syncRenderersAfterMapChange();
  },
  onRadiusChanged: (radius) => {
    brush.setRadius(radius);
    line.setRadius(radius);
    eraser.setRadius(radius);
  },
  onSpaceChanged: (space) => {
    brush.setSpacing(space);
    eraser.setSpacing(space);
    propPlacement.setScatterSpacing(space);
  },
  onSpeedChanged: (speed) => {
    entityManager.setSpeedMultiplier(speed);
  },
  onDensityChanged: (type, value) => {
    entityManager.setDensityMultiplier(type, value);
  },
  onToggleFoam: (enabled) => {
    coastRenderer?.setFoamEnabled(enabled);
  },
  onToggleAutoRepopulate: (enabled) => {
    entityManager.setAutoRepopulate(enabled);
  },
  onRepopulateNow: () => {
    entityManager.repopulateNow();
  },
  onCenterCamera: () => {
    const bounds = computeLandBounds(tilemap);
    if (bounds) {
      isleCamera.x = bounds.centroidTileX * TILE_SIZE + TILE_SIZE / 2;
      isleCamera.y = bounds.centroidTileY * TILE_SIZE + TILE_SIZE / 2;
    } else {
      isleCamera.x = 0;
      isleCamera.y = 0;
    }
  },
  onNavigateCamera: (worldX, worldY) => {
    isleCamera.x = worldX;
    isleCamera.y = worldY;
  },
  onSaveMapImage: () => {
    const wasUIHidden = uiManager.uiHidden;
    if (!wasUIHidden) uiManager.toggleUI();
    renderer.render(scene, isleCamera.three);
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapa.png';
    a.click();
    if (!wasUIHidden) uiManager.toggleUI();
  },
  getVillagerCount: () => entityManager.villagers.length,
  onApplySettings: (_volume, dpr) => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, dpr));
  },
  onSettings: () => { /* handled by UIManager → SettingsModal */ },
  onPause: (paused) => {
    entityManager.setPaused(paused);
  },
  onToggleUI: () => {
    // Handled by UIManager internally, but we can do extra stuff if needed.
  },
  onScreenshot: () => {
    const wasUIHidden = uiManager.uiHidden;
    if (!wasUIHidden) uiManager.toggleUI();
    renderer.render(scene, isleCamera.three);
    const url = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screenshot.png';
    a.click();
    if (!wasUIHidden) uiManager.toggleUI();
  },
}, tilemap);

toolSystem.setTool(brush);
renderer.domElement.style.cursor = uiManager.toolbar.activeCursor;

const debugOverlay = new DebugOverlay(import.meta.env.DEV);

function resize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  isleCamera.resize(width, height);
}

window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
    history.undo();
    syncRenderersAfterMapChange();
  } else if (e.ctrlKey && (e.key === 'y' || e.key === 'Y')) {
    history.redo();
    syncRenderersAfterMapChange();
  } else if (!e.ctrlKey) {
    switch (e.key.toLowerCase()) {
      case 'b': uiManager.toolbar.setTool('brush'); break;
      case 'l': uiManager.toolbar.setTool('line'); break;
      case 'r': uiManager.toolbar.setTool('rect'); break;
      case 'g': uiManager.toolbar.setTool('bucket'); break;
      case 'e': uiManager.toolbar.setTool('eraser'); break;
      case 'i': uiManager.toolbar.setTool('dropper'); break;
      case 'h': uiManager.toolbar.setTool('hand'); break;
    }
  }
});

// Capture Tab to toggle UI
window.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    uiManager.toggleUI();
  }
});

let rightWasDown = false;

function updateInteraction(): void {
  const isPan = input.isPanActive();
  const world = isleCamera.screenToWorld(input.pointer.x, input.pointer.y);

  if (input.isButtonDown(2) && !rightWasDown && !isPan) {
    propPlacement.tryRemoveAt(world.x, world.y);
  }
  rightWasDown = input.isButtonDown(2);

  const isAction = input.isButtonDown(0) && !isPan;

  if (activeTab === 'land') {
    toolSystem.update(isAction, world.x, world.y, currentLayer);
    previewRenderer.update(toolSystem.getPreview(currentLayer));
    propPreviewRenderer?.update(null, 0, 0, false);
  } else {
    previewRenderer.update([]);
    propPlacement.update(isAction, world.x, world.y);
    const preview = propPlacement.getPreviewTile(world.x, world.y);
    const def = propPlacement.selectedDefId ? getPropDefinition(propPlacement.selectedDefId) : null;
    if (preview && def) {
      propPreviewRenderer?.update(def, preview.tileX, preview.tileY, preview.valid);
    } else {
      propPreviewRenderer?.update(null, 0, 0, false);
    }
  }
}

async function boot(): Promise<void> {
  // Sidepanel pode ter chamado buildPropsAtlas() antes — força recarga do PNG.
  invalidatePropsAtlasCache();
  invalidateEntityAtlasCache();
  await Promise.all([
    loadPropsAtlasFromImage(`${import.meta.env.BASE_URL}assets/atlas/props-atlas.png`),
    loadEntityAtlasFromImage(`${import.meta.env.BASE_URL}assets/atlas/entity-atlas.png`),
    preloadPropModels(),
    preloadEntityModels(),
  ]);
  const propsAtlas = buildPropsAtlas();
  const entityAtlas = buildEntityAtlas();

  coastRenderer = new CoastRenderer(coastManager, propsAtlas);
  propRenderer = new PropRenderer(propMap, propsAtlas);
  propPreviewRenderer = new PropPreviewRenderer(propsAtlas);
  entityRenderer = new EntityRenderer(entityAtlas);

  scene.add(coastRenderer.group);
  scene.add(terrainRenderer.group);
  scene.add(propRenderer.group);
  scene.add(entityRenderer.group);
  scene.add(propPreviewRenderer.group);

  seedStarterIsland(tilemap);
  seedStarterProps(tilemap, propMap);
  coastManager.invalidateAll();
  propRenderer.markDirty();

  startGameLoop();
}

function startGameLoop(): void {
const loop = new GameLoop(
  (dt) => {
    isleCamera.update(dt, input);
    ocean.update(dt, isleCamera.x, isleCamera.y, isleCamera.halfViewWidth, isleCamera.halfViewHeight);
    updateInteraction();
    terrainRenderer.rebuildDirtyChunks();
    coastRenderer.update(dt);
    coastRenderer.rebuildDirty();
    propRenderer.rebuildIfDirty();
    propRenderer.faceCamera(isleCamera.three);
    propPreviewRenderer?.faceCamera(isleCamera.three);
    coastRenderer.faceCamera(isleCamera.three);
    entityManager.update(dt, isleCamera.x, isleCamera.y);
    entityRenderer.sync(
      entityManager,
      isleCamera.x,
      isleCamera.y,
      uiManager.isPaused,
      isleCamera.three,
    );
    uiManager.updateMapTab({
      x: isleCamera.x,
      y: isleCamera.y,
      halfViewWidth: isleCamera.halfViewWidth,
      halfViewHeight: isleCamera.halfViewHeight,
    });
    if (input.isPanActive()) {
      renderer.domElement.style.cursor = 'grabbing';
    } else {
      renderer.domElement.style.cursor = uiManager.toolbar.activeCursor;
    }
    debugOverlay.update(dt, isleCamera.zoom);
  },
  () => {
    renderer.render(scene, isleCamera.three);
  },
);

loop.start();
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  showToast('Falha ao carregar atlas — veja o console.');
});
