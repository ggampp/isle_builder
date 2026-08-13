import { Game } from './game/game.ts';

const mount = document.getElementById('app');
if (!mount) throw new Error('#app não encontrado');

Game.boot(mount).catch((err) => {
  console.error('Falha ao iniciar Splinter', err);
});
