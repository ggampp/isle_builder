import { Game } from './game/game.ts';
import { preloadBuildingModels } from './render/modelLoader.ts';
import { showMapSelect } from './ui/mapSelect.ts';

const container = document.getElementById('app');
if (!container) throw new Error('#app não encontrado');

async function boot(root: HTMLElement): Promise<void> {
  await preloadBuildingModels();
  const mapId = await showMapSelect(root);
  new Game(root, mapId);
}

boot(container).catch((err) => {
  console.error('Falha ao iniciar Canyon Rails', err);
});
