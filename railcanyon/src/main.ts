import { Game } from './game/game.ts';

const container = document.getElementById('app');
if (!container) throw new Error('#app não encontrado');

new Game(container);
