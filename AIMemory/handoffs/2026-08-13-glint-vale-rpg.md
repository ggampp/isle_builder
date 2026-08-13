# Handoff — 2026-08-13 — Glint: quinto jogo do repositório

O usuário pediu para criar um jogo novo a partir do post
https://x.com/Sthilhearts/status/2087471340911751547, numa pasta própria.
Vídeo (~59s, 1280×720@60fps) baixado e analisado quadro a quadro — ficou só
no scratchpad, não foi commitado.

## O que o vídeo mostra e o que virou regra

Action RPG HD-2D (sprite pixelado num vale 3D de platôs, rio e falésias).
HUD mínimo no canto: Lv, HP, MP. Combate em tempo real com círculo mágico
amarelo que gasta MP; slimes verdes; cristais azuis de descanso; **Level Up !**
por volta dos 21s (Lv.2, HP 16, MP 12, depois um +10 enchendo as barras).

Regras em `glint/GAME_PLAN.md`: magia custa 2 MP e o dano cresce com o nível
(o ponto do tweet — “nível deixa o combate mais gostoso”); sem MP cai num
cutelo grátis; cristal aplica +10 HP e enche MP; o rio é raso e caminhável,
degrau de 2 alturas bloqueia.

## Estrutura

`glint/` é uma app Vite própria (Three.js). Lógica pura em `src/sim/` (stats,
combate, mapa em altura, inimigos), render em `src/render/`, HUD no estilo do
vídeo, áudio sintetizado no Web Audio.

## Verificação

24 testes (fórmulas do vídeo, magia/cutelo, level-up, alcançabilidade dos
cristais) e `npm run build` com gate `tsc`.

## Integração

Quinto gabinete na `landing/` (vale, rio, slimes, Level Up), rota `/glint/` no
workflow do Pages, README / CLAUDE.md / AGENTS.md atualizados.
