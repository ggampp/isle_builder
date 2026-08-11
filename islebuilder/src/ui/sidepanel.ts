import { PROP_CATALOG, getDecorScatterProps, type PropDefinition } from '../props/catalog.ts';
import { buildPropsAtlas } from '../render/art/propsAtlas.ts';
import { TerrainLayer } from '../world/layers.ts';
import { WorldTab, type WorldTabCallbacks } from './worldtab.ts';
import { MapTab, type MapTabCallbacks } from './maptab.ts';
import { HelpTab } from './helptab.ts';
import { createIconImg, type UiIconId } from './uiIcons.ts';
import type { Tilemap } from '../world/tilemap.ts';

export type SideTab = 'land' | 'decor' | 'props' | 'world' | 'map' | 'help';
export type TerrainOption = 'water' | 'sand' | 'grass' | 'path' | 'bridge' | 'cliff';

export const LAYER_BY_OPTION: Record<TerrainOption, number> = {
  water: TerrainLayer.Water,
  sand: TerrainLayer.Sand,
  grass: TerrainLayer.Grass,
  path: TerrainLayer.Path,
  bridge: TerrainLayer.Bridge,
  cliff: TerrainLayer.Cliff,
};

export interface SidePanelCallbacks extends WorldTabCallbacks, MapTabCallbacks {
  onTabChanged: (tab: SideTab) => void;
  onPropSelected: (defId: string | null) => void;
  onLayerChanged: (layer: number) => void;
}

export class SidePanel {
  private selectedLayerOption: TerrainOption = 'sand';
  private readonly propButtons = new Map<string, HTMLButtonElement>();
  private readonly tabButtons = new Map<SideTab, HTMLDivElement>();
  private readonly layerButtons = new Map<TerrainOption, HTMLDivElement>();
  
  private hosts: Record<SideTab, HTMLDivElement>;
  
  public worldTab: WorldTab;
  public mapTab: MapTab;
  public helpTab: HelpTab;
  private callbacks: SidePanelCallbacks;

  constructor(callbacks: SidePanelCallbacks, tilemap: Tilemap) {
    this.callbacks = callbacks;
    const atlas = buildPropsAtlas();

    const root = document.createElement('div');
    root.className = 'isle-panel';
    root.style.cssText =
      'position:fixed;top:8px;right:8px;width:330px;max-height:96vh;' +
      'display:flex;flex-direction:column;gap:0;z-index:9999;';

    const tabsRow = document.createElement('div');
    tabsRow.style.cssText = 'display:flex;gap:6px;justify-content:space-between;margin-bottom:12px;';

    const tabDefs: { id: SideTab; icon: UiIconId; bg: string; label: string }[] = [
      { id: 'land', icon: 'land', bg: '#6fbf4a', label: 'Land' },
      { id: 'decor', icon: 'decor', bg: '#4fae52', label: 'Decor' },
      { id: 'props', icon: 'props', bg: '#e0703a', label: 'Props' },
      { id: 'world', icon: 'world', bg: '#3fa7e0', label: 'World' },
      { id: 'map', icon: 'map', bg: '#9b6fd6', label: 'Map' },
      { id: 'help', icon: 'help', bg: '#f0b432', label: 'Help' },
    ];

    for (const def of tabDefs) {
      const tabEl = document.createElement('div');
      tabEl.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px 5px;border-radius:12px;cursor:pointer;background:var(--card-bg);border:2px solid transparent;';
      
      const icon = document.createElement('div');
      icon.style.cssText = `width:26px;height:26px;border-radius:7px;display:grid;place-items:center;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25);background:${def.bg};`;
      icon.appendChild(createIconImg(def.icon, 18));
      
      const span = document.createElement('span');
      span.style.cssText = 'font-size:9px;font-weight:600;color:var(--text-dim);letter-spacing:.3px;text-transform:uppercase;';
      span.textContent = def.label;
      
      tabEl.append(icon, span);
      tabEl.addEventListener('click', () => this.setTab(def.id));
      this.tabButtons.set(def.id, tabEl);
      tabsRow.appendChild(tabEl);
    }

    const content = document.createElement('div');
    content.style.cssText = 'overflow-y:auto;flex:1;min-height:0;padding-right:2px;';

    this.hosts = {
      land: document.createElement('div'),
      decor: document.createElement('div'),
      props: document.createElement('div'),
      world: document.createElement('div'),
      map: document.createElement('div'),
      help: document.createElement('div'),
    };

    for (const tabId of Object.keys(this.hosts) as SideTab[]) {
      this.hosts[tabId].style.display = 'none';
      content.appendChild(this.hosts[tabId]);
    }

    root.append(tabsRow, content);
    document.body.appendChild(root);

    // Populate Land Tab (Terrain Layers)
    this.buildLandTab(this.hosts.land);

    // Populate Decor & Props
    this.buildPropGrid(this.hosts.decor, getDecorScatterProps(), atlas.cellPx);
    const nonDecor = PROP_CATALOG.filter((p) => !p.scatter);
    this.buildPropGrid(this.hosts.props, nonDecor, atlas.cellPx);

    // Instantiate new tabs
    this.worldTab = new WorldTab(this.hosts.world, callbacks);
    this.mapTab = new MapTab(this.hosts.map, callbacks, tilemap);
    this.helpTab = new HelpTab(this.hosts.help);

    this.setTab('land');
  }

  setLayer(layer: number): void {
    const entry = Object.entries(LAYER_BY_OPTION).find(([, val]) => val === layer);
    if (entry) {
      this.setLayerByOption(entry[0] as TerrainOption);
    }
  }

  private buildLandTab(host: HTMLDivElement): void {
    const title = document.createElement('div');
    title.className = 'sec-title';
    title.textContent = 'CHOOSE A TERRAIN';
    host.appendChild(title);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:6px;';

    const layers: { id: TerrainOption; label: string; icon: UiIconId }[] = [
      { id: 'water', label: 'Water', icon: 'water' },
      { id: 'sand', label: 'Sand', icon: 'sand' },
      { id: 'grass', label: 'Grass', icon: 'grass' },
      { id: 'path', label: 'Path', icon: 'path' },
      { id: 'bridge', label: 'Bridge', icon: 'bridge' },
      { id: 'cliff', label: 'Cliff', icon: 'cliff' },
    ];

    for (const l of layers) {
      const btn = document.createElement('div');
      btn.style.cssText = `border-radius:10px;border:2px solid transparent;cursor:pointer;background:var(--card-bg);padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;`;

      const swatch = document.createElement('div');
      swatch.style.cssText = 'width:100%;height:32px;border-radius:6px;background:var(--card-bg-hover);display:grid;place-items:center;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25);';
      swatch.appendChild(createIconImg(l.icon, 28));
      
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:11px;font-weight:600;color:var(--text);';
      lbl.textContent = l.label;

      btn.append(swatch, lbl);
      btn.addEventListener('click', () => this.setLayerByOption(l.id));
      this.layerButtons.set(l.id, btn);
      grid.appendChild(btn);
    }
    host.appendChild(grid);
    this.updateLayerButtons();
  }

  private setLayerByOption(option: TerrainOption): void {
    this.selectedLayerOption = option;
    this.updateLayerButtons();
    this.callbacks.onLayerChanged(LAYER_BY_OPTION[option]);
  }

  private updateLayerButtons(): void {
    for (const [key, btn] of this.layerButtons) {
      if (key === this.selectedLayerOption) {
        btn.style.borderColor = 'var(--accent)';
        btn.style.background = '#2b5787';
      } else {
        btn.style.borderColor = 'transparent';
        btn.style.background = 'var(--card-bg)';
      }
    }
  }

  private setTab(tab: SideTab): void {
    
    for (const [key, host] of Object.entries(this.hosts)) {
      host.style.display = key === tab ? 'block' : 'none';
    }

    for (const [key, btn] of this.tabButtons) {
      if (key === tab) {
        btn.style.borderColor = 'var(--accent)';
        btn.style.background = '#2b5787';
        (btn.lastChild as HTMLElement).style.color = 'var(--accent)';
      } else {
        btn.style.borderColor = 'transparent';
        btn.style.background = 'var(--card-bg)';
        (btn.lastChild as HTMLElement).style.color = 'var(--text-dim)';
      }
    }

    if (tab === 'land') {
      this.selectProp(null);
    }

    if (tab === 'map') {
      this.mapTab.update();
    }

    this.callbacks.onTabChanged(tab);
  }

  private buildPropGrid(host: HTMLDivElement, items: PropDefinition[], cellPx: number): void {
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:6px;';

    for (const def of items) {
      const btn = document.createElement('button');
      btn.title = def.name;
      btn.style.cssText =
        'aspect-ratio:1;border-radius:8px;border:2px solid transparent;' +
        'cursor:pointer;background:var(--card-bg);padding:2px;overflow:hidden;';

      const canvas = document.createElement('canvas');
      const previewSize = 40;
      canvas.width = previewSize;
      canvas.height = previewSize;
      canvas.style.cssText = 'width:100%;height:100%;image-rendering:pixelated;';
      const atlas = buildPropsAtlas();
      const col = def.atlasIndex % atlas.cols;
      const row = Math.floor(def.atlasIndex / atlas.cols);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          atlas.texture.image as HTMLCanvasElement,
          col * cellPx, row * cellPx, cellPx, cellPx,
          0, 0, previewSize, previewSize,
        );
      }

      btn.appendChild(canvas);
      btn.addEventListener('click', () => this.selectProp(def.id));
      this.propButtons.set(def.id, btn);
      grid.appendChild(btn);
    }

    host.appendChild(grid);
  }

  private selectProp(defId: string | null): void {
    for (const [id, btn] of this.propButtons) {
      btn.style.borderColor = id === defId ? 'var(--accent)' : 'transparent';
      btn.style.background = id === defId ? '#2b5787' : 'var(--card-bg)';
    }
    this.callbacks.onPropSelected(defId);
  }
}
