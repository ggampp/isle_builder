import { Topbar, type TopbarCallbacks } from './topbar.ts';
import { Toolbar, type ToolbarCallbacks } from './toolbar.ts';
import { SystemButtons, type SystemButtonCallbacks } from './systembuttons.ts';
import { SidePanel, type SidePanelCallbacks } from './sidepanel.ts';
import { Logo } from './logo.ts';
import { SettingsModal, loadSettings } from './settingsModal.ts';
import type { Tilemap } from '../world/tilemap.ts';
import type { CameraView } from './maptab.ts';

export interface UICallbacks extends TopbarCallbacks, ToolbarCallbacks, SystemButtonCallbacks, SidePanelCallbacks {
  onApplySettings: (volume: number, dpr: number) => void;
}

export class UIManager {
  private isUIHidden = false;
  private uiRoot: HTMLDivElement;
  private mapTabActive = false;

  public topbar: Topbar;
  public toolbar: Toolbar;
  public systemButtons: SystemButtons;
  public sidePanel: SidePanel;
  public logo: Logo;
  public settingsModal: SettingsModal;

  constructor(callbacks: UICallbacks, tilemap: Tilemap) {
    this.uiRoot = document.createElement('div');
    this.uiRoot.id = 'ui-root';
    document.body.appendChild(this.uiRoot);

    const interceptCallbacks = {
      ...callbacks,
      onToggleUI: () => {
        this.toggleUI();
        callbacks.onToggleUI();
      },
      onTabChanged: (tab: Parameters<SidePanelCallbacks['onTabChanged']>[0]) => {
        this.mapTabActive = tab === 'map';
        if (this.mapTabActive) this.sidePanel.mapTab.update();
        callbacks.onTabChanged(tab);
      },
    };

    this.settingsModal = new SettingsModal({
      onApply: (state) => callbacks.onApplySettings(state.volume, state.dpr),
      onResetMap: callbacks.onClear,
    });

    const systemCallbacks = {
      ...interceptCallbacks,
      onSettings: () => this.settingsModal.show(),
    };

    this.topbar = new Topbar(this.uiRoot, interceptCallbacks);
    this.toolbar = new Toolbar(this.uiRoot, interceptCallbacks);
    this.systemButtons = new SystemButtons(this.uiRoot, systemCallbacks);
    this.sidePanel = new SidePanel(interceptCallbacks, tilemap);
    this.logo = new Logo(this.uiRoot);

    const sidePanelEl = document.querySelector('.isle-panel[style*="right: 8px"]');
    if (sidePanelEl) this.uiRoot.appendChild(sidePanelEl);

    loadSettings();
  }

  public toggleUI(): void {
    this.isUIHidden = !this.isUIHidden;
    this.uiRoot.style.display = this.isUIHidden ? 'none' : 'block';
  }

  public get uiHidden(): boolean {
    return this.isUIHidden;
  }

  public get isPaused(): boolean {
    return this.systemButtons.isPaused;
  }

  public updateMapTab(camera: CameraView): void {
    if (this.mapTabActive) {
      this.sidePanel.mapTab.update(camera);
    }
  }
}
