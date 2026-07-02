# Sprint 01 — Fundação: projeto, loop, câmera e oceano

- **Status:** Concluído
- **Duração sugerida:** 1 semana
- **Início / Fim:** 2026-07-02 / 2026-07-02
- **Dependências:** nenhuma
- **Referências:** `GAME_PLAN.md` §3–4 (stack e arquitetura), Fase 0

## Objetivo

Ter a base técnica do jogo rodando no navegador: projeto Vite + TypeScript +
Three.js com câmera ortográfica, loop de jogo estável e um oceano animado de
fundo com navegação de câmera (zoom e pan) fluida.

## Entregável

Página no navegador exibindo o oceano animado em tela cheia, com zoom (roda do
mouse, centrado no cursor) e pan (arrastar) suaves, a 60fps, com contador de
FPS em modo dev.

## Escopo

**Dentro:**
- Scaffold e estrutura de pastas da arquitetura alvo.
- Loop de jogo, câmera, input de câmera e render do oceano.

**Fora (não fazer nesta sprint):**
- Tiles, pintura, UI de ferramentas, entidades, props, sons.

## Tarefas

- [x] Criar projeto: Vite (vanilla-ts) + `three`; TS em modo `strict` (mais `erasableSyntaxOnly`, `noUnusedLocals/Parameters` do template).
- [x] Criar estrutura de pastas: `src/{core,world,tools,entities,props,ui,persistence,render}` (pastas ainda vazias marcadas com `.gitkeep`).
- [x] `core/loop.ts`: `GameLoop` com `requestAnimationFrame`, delta clampado em 0.1s, update/render separados.
- [x] `core/camera.ts`: `IsleCamera` (wrapper de `OrthographicCamera`), zoom 0.1x–8x com easing exponencial, âncora no cursor recalculada a cada frame durante a interpolação.
- [x] `core/input.ts`: `InputManager` — ponteiro em tela, botões, teclado, wheel acumulado, pan por arrasto (botão do meio ou espaço+clique esquerdo).
- [x] `render/ocean.ts`: `Ocean` — plano reposicionado ao viewport da câmera, shader com 2 octaves de ruído de valor (hash-based) + listras diagonais sutis, cor calculada em coordenadas de mundo reais (estável durante pan/zoom).
- [x] Resize da janela tratado (`renderer.setSize` + `IsleCamera.resize`); DPR limitado a 2 (`MAX_DEVICE_PIXEL_RATIO`).
- [x] `core/debug.ts`: `DebugOverlay` com contador de FPS, só instanciado quando `import.meta.env.DEV`.
- [x] `.gitignore` criado incluindo `node_modules`, `dist` e **`game_video.mp4`**.

## Critérios de aceite

1. **Verificado** — 60fps estáveis com o oceano animado em tela cheia (overlay de FPS, screenshots no Chrome).
2. **Verificado** — zoom testado via `WheelEvent` sintético (deltaY negativo/positivo) centrado no cursor; sem saltos perceptíveis, espaçamento das listras aumenta/diminui conforme esperado.
3. **Verificado** — pan testado via sequência sintética de `PointerEvent` (pointerdown botão 1 → pointermove × N → pointerup): padrão do oceano desloca sem jitter; resize de janela (900×600 → 1280×800) não distorce as listras (ângulo permanece consistente).
4. **Verificado** — console do navegador sem erros/warnings (só logs de HMR do Vite) em todas as checagens.
5. **Verificado** — `npm run build` (`tsc && vite build`) completa sem erros; bundle gerado em `dist/`.

## Riscos

- Escala pixel-perfect vs. zoom contínuo: adiado para a Sprint 02/05 (quando
  sprites/tiles entram em cena) — decisão registrada como pendência técnica:
  aplicar `NearestFilter` em toda textura de tile/sprite futura.
- O ambiente de automação de navegador não simula clique do botão do meio
  nem tecla segurada durante arrasto; pan foi validado via `PointerEvent`
  sintético (equivalente funcional). Reconfirmar manualmente com mouse real
  na primeira oportunidade.

## Notas de implementação (para as próximas sprints)

- `IsleCamera` expõe `x`, `y`, `zoom`, `halfViewWidth/Height` e `screenToWorld()` —
  API estável que a Sprint 02 (tilemap) vai usar para converter cursor → tile.
- `InputManager` é agnóstico de ferramenta: só expõe estado bruto
  (`consumeWheelDelta`, `consumeDragDelta`, `isKeyDown`, `isButtonDown`).
  As ferramentas de desenho da Sprint 03 devem consumir `pointer`/`isButtonDown`
  diretamente, sem duplicar listeners de evento.
- `Ocean` é reaproveitável como camada de fundo permanente; a água rasa/recifes
  da Sprint 04 devem ser um sistema **separado** (não misturar no shader do oceano profundo).
