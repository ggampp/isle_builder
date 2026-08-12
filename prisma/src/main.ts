import { Game } from './game/game.ts';

const mount = document.getElementById('app');
if (!mount) throw new Error('#app não encontrado');

new Game(mount);
