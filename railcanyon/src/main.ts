import { Game } from './game/game.ts';
import { preloadBuildingModels } from './render/modelLoader.ts';

const container = document.getElementById('app');
if (!container) throw new Error('#app não encontrado');

async function boot(root: HTMLElement): Promise<void> {
  await preloadBuildingModels();
  new Game(root);
}

boot(container).catch((err) => {
  console.error('Falha ao iniciar Canyon Rails', err);
});
