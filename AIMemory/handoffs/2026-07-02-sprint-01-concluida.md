# Handoff — Sprint 01 (Fundação) concluída

- **Data:** 2026-07-02T17:16Z
- **Agente:** Claude Code (Sonnet 5)
- **Estado:** Sprint 01 concluída e verificada; Sprint 02 não iniciada

## O que foi feito

1. Projeto Vite + TypeScript (`strict`) + Three.js escaffoldado na raiz do
   repositório (`package.json`, `tsconfig.json`, `index.html`, `public/`).
2. Estrutura de pastas criada: `src/{core,world,tools,entities,props,ui,persistence,render}`
   (as vazias têm `.gitkeep`).
3. Implementado:
   - `src/core/loop.ts` — `GameLoop` (rAF, delta clampado em 0.1s).
   - `src/core/input.ts` — `InputManager` (ponteiro, botões, teclado, wheel
     acumulado, pan por botão do meio ou espaço+clique esquerdo).
   - `src/core/camera.ts` — `IsleCamera` (ortográfica, zoom 0.1x–8x com easing
     exponencial sempre ancorado no cursor, `screenToWorld`, `halfViewWidth/Height`).
   - `src/core/debug.ts` — `DebugOverlay` (FPS, só ativo com `import.meta.env.DEV`).
   - `src/render/ocean.ts` — `Ocean` (shader procedural: 2 octaves de ruído +
     listras diagonais sutis, avaliado em coordenadas de mundo reais).
   - `src/main.ts` — liga tudo, trata resize e cap de DPR (2x).
4. `.gitignore` criado (inclui `game_video.mp4`).
5. Verificação no Chrome (`claude-in-chrome`): screenshots confirmam 60fps
   estáveis; zoom testado via `WheelEvent` sintético (deltaY + / −) centrado no
   cursor; pan testado via sequência `PointerEvent` sintética (botão 1);
   resize de janela (900×600 → 1280×800) sem distorção; console sempre limpo.
   `npm run build` completa sem erros.
6. `sprints/SPRINT_01_fundacao.md`, `sprints/ANDAMENTO.md` e
   `AIMemory/PROJECT_OVERVIEW.md` atualizados com o resultado.

## Onde parei / próximo passo

**Sprint 02 (Tilemap e pintura) ainda não iniciada.** Ler
`sprints/SPRINT_02_tilemap_pintura.md` por inteiro antes de começar. Pontos que
o próximo agente deve saber antes de mexer:

- `IsleCamera.screenToWorld(x, y)` já existe e deve ser reaproveitado para
  converter cursor → coordenada de mundo → tile (dividir por tamanho do tile).
- `InputManager` é agnóstico de ferramenta — a Sprint 02/03 deve **consumir**
  `pointer`, `isButtonDown`, etc., e não duplicar listeners de mouse.
- O oceano (`Ocean`) é só o fundo profundo; o tilemap é uma camada nova por
  cima, não deve substituir nem se misturar ao shader do oceano.
- Ainda não há test runner configurado — a Sprint 02 pede testes do
  auto-tiler; escolher e instalar o runner (ex.: Vitest, já que é Vite-nativo)
  nesse momento.

## Duas armadilhas novas descobertas (já em `PROJECT_OVERVIEW.md`)

1. `npm create vite@latest <caminho-absoluto-windows>` quebra neste ambiente
   (mangla o path). Sempre `cd` para o destino e escaffoldar com `.` via
   PowerShell.
2. O template Vite atual ativa `erasableSyntaxOnly` no `tsconfig.json` —
   parameter properties em construtor (`constructor(private x: Foo)`) não
   compilam. Declarar o campo e atribuir manualmente no corpo do construtor.

## Avisos

- Servidor de dev (`vite --port 5183`) foi encerrado ao fim da sessão — rodar
  `npm run dev` novamente para continuar testando manualmente.
- Nenhum commit git foi feito (repositório ainda não inicializado).
