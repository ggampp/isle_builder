# Handoff — 2026-08-19 — Emberhold: sexto jogo do repositório

O usuário pediu para criar um jogo novo a partir do post
https://x.com/Fortryv/status/2089053430379667464, com assets e sprites em
movimento. Vídeo (~43s, 1280×720@60fps) baixado e analisado quadro a quadro —
ficou só no scratchpad, não foi commitado.

## O que o vídeo mostra e o que virou regra

Sandbox isométrico pixel-art (RTS × ARPG): campo gramado, chuva, fortaleza de
pedra, palissada de madeira, torres de telhado azul, casas, trabalhadores,
soldados de placa e um herói minerando. HUD densa (recursos no topo, globos de
vida/mana, barra de skills, XP, log de construção). O patch 0.5.21 é o recorte
jogável: **reparo sob ataque**, **trabalhadores largam o corte abaixo de 50%
HP**, **clique direito repara**, **patrulha defende em vez de cortar árvore
com a cidade em chamas**, torres com mais alcance/dano, cartão de pet que vira.

Regras em `emberhold/GAME_PLAN.md`. Nome, arte e código são originais (warden
verde-teal, raposa Brasa, cobre/pedra na HUD).

## Estrutura

`emberhold/` é uma app Vite própria (Canvas 2D isométrico). Lógica pura em
`src/sim/` (mapa, prédios, unidades, ondas), atlas procedural com walk/ataque
/corte/reparo em 4 direções em `src/render/sprites.ts`, HUD no estilo do vídeo,
áudio sintetizado no Web Audio.

## Verificação

24 testes (HP das estruturas, reparo sob ataque, auto-reparo dos trabalhadores,
patrulha que defende, tiro da torre, ondas, magia, XP, treino da casa) e
`npm run build` com gate `tsc`.

## Integração

Sexto gabinete na `landing/` (keep, palissada, “PAREDE SOB ATAQUE!”), rota
`/emberhold/` no workflow do Pages, README / CLAUDE.md / AGENTS.md atualizados.
