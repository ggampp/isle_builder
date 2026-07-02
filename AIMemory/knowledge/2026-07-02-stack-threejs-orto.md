# Decisão: stack Vite + TypeScript + Three.js com câmera ortográfica

- **Data:** 2026-07-02
- **Status:** aceita (fase de planejamento)

## Contexto

O jogo de referência (Isle Builder, ver `game_video.mp4` e `GAME_PLAN.md`) é
100% 2D: tilemap top-down em pixel art com sprites. As opções naturais eram
PixiJS v8 (renderer 2D dedicado), Canvas 2D puro, ou Three.js com câmera
ortográfica renderizando sprites/planos.

## Decisão

**Three.js com câmera ortográfica**, sprites em planos com instancing,
scaffold Vite + TypeScript.

## Justificativa

- O ambiente de desenvolvimento tem um pipeline completo de skills `threejs-*`
  (director, gameplay-systems, image-generator, audio-generator, ui-designer,
  qa-release, debug-profiler) que orquestra construção, assets, QA e release —
  usar PixiJS abriria mão dessa automação.
- WebGL via Three.js atende com folga o requisito de performance observado
  (60fps em 4K com centenas de agentes), desde que se use
  InstancedMesh/batching e culling.
- Câmera ortográfica + escala de pixel controlada reproduz o visual pixel-perfect.

## Consequências / limites

- Não introduzir câmera perspectiva nem geometria 3D — o jogo é 2D.
- Todo sprite/tile deve passar por atlas + instancing; evitar um Mesh por tile
  (usar re-mesh por chunk de 32×32 tiles, ver `GAME_PLAN.md` §4).
- Se num futuro a stack se mostrar inadequada, PixiJS v8 é o plano B — a
  arquitetura (core/world/tools/entities separados do render) deve manter o
  renderer isolado para permitir essa troca.
