# Handoff — 2026-08-11 — Canyon Rails: novo jogo, Sprint 01 (fatia vertical)

## Contexto

O usuário pediu para reproduzir o jogo do post https://x.com/DilumSanjaya/status/2086858760753201622,
baixando o vídeo via cobalt.tools. Descobertas da sessão:

1. **O vídeo NÃO é o jogo de ilhas** que este repo recria — é outro jogo do mesmo
   autor: um builder de ferrovias 3D low-poly num desfiladeiro desértico
   ("Rail Canyon" no vídeo). Mesa cercada por rio turquesa em canyon, trilhos
   assentados peça a peça (ghost verde + railhead brilhante), trem com vagões e
   fumaça, economia coins/score/level, contratos com timer, painel do trem
   (Speed/Logs/Condition/Wagons), nav Trains/Network/Contracts/Shop, minimapa
   com grafo da rede. Análise completa em `railcanyon/GAME_PLAN.md` §1.
2. **cobalt.tools não funcionou** neste ambiente: a API pública exige JWT emitido
   via Turnstile (captcha no browser), e o Chromium do ambiente não fecha TLS
   através do proxy de egress (ERR_CONNECTION_RESET em qualquer https externo;
   localhost funciona). **Fallback: yt-dlp** baixou o vídeo do X sem fricção →
   `game_video.mp4` na raiz (83 MB, 1m04s, 3024×1714@60fps, gitignored).
   Frames de referência extraídos com ffmpeg (via `pip install imageio-ffmpeg`,
   apt não funciona aqui) ficaram só no scratchpad da sessão.

## O que foi feito

- **Fix no Isle Builder**: `src/main.ts` importava `./render/Ocean.ts` mas o
  arquivo no git é `ocean.ts` — quebrava `npm run build` em Linux (case-sensitive).
  Import corrigido; build + 52 testes verdes de novo.
- **Novo sub-projeto `railcanyon/`** (Vite + TS + Three, mesmas convenções do
  repo-mãe, app própria com `package.json` próprio — rodar `npm install` dentro
  de `railcanyon/`). Plano em fases: `railcanyon/GAME_PLAN.md`.
- **Sprint 01 (fatia vertical) concluída**:
  - `src/world/heightfield.ts` — altura determinística pura (mesa + rio anelar
    cavado + 8 buttes), testável sem DOM.
  - `src/world/terrain.ts` — malha não indexada com cor por face (look facetado),
    água turquesa; `src/world/scatter.ts` — ~1.760 instâncias (pedras/cactos/
    arbustos/flores) com RNG semeado, evitando rio e faixa da linha.
  - `src/rail/track.ts` — loop CatmullRom fechado amostrado por arc-length,
    dormentes instanciados + trilhos em tubo; `src/rail/train.ts` — loco azul +
    4 vagões seguindo a curva por arc-length (nunca sai do trilho por construção,
    lição do Isle Builder), fumaça com pool de 36 puffs; 20 u/s ≈ 45 mph do vídeo.
  - `src/core/camera.ts` — rig orbital WASD pan / left-drag pan / right-drag
    turn / wheel zoom; `src/ui/hud.ts` + `styles.css` — shell da HUD no layout do
    vídeo (título, moedas/pontos/nível, Objetivo, Construir 12 itens com preço,
    painel do trem com velocidade real, nav inferior, toasts);
    `src/ui/minimap.ts` — minimapa real pintado da heightfield + linha + trem.
  - 8 testes Vitest (heightfield determinística/rio abaixo da água em toda a
    volta; track sempre em terra/espaçamento uniforme/tangentes/fechamento).
  - `npm run build` (gate tsc) + `npm run test` verdes; verificado no browser
    via `npm run preview` + screenshot (agent-browser em localhost): trem
    circulando, HUD ok, 45 mph no painel.

## Próximos passos (ver `railcanyon/GAME_PLAN.md` §2)

- S02: assentamento de trilhos (railhead + ghost verde + custo + undo + ponte
  trestle sobre o rio). S03: combustível/condição/estações. S04: construções.
  S05: economia/contratos. S06: release.
- Melhorias visuais pendentes da S01: pinheiros em bolsões de "floresta",
  cidades com casas prontas, buttes mais presentes no enquadramento inicial.
