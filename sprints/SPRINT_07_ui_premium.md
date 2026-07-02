# Sprint 07 — UI premium e telas auxiliares

- **Status:** Concluído
- **Duração sugerida:** 1–2 semanas
- **Dependências:** Sprints 03 e 05 (ferramentas e abas funcionais existem; aqui ganham o visual final)
- **Referências:** `GAME_PLAN.md` §2.6; skill `threejs-game-ui-designer`; vídeo — UI casual/cartoon azul-escura

## Objetivo

Elevar a UI funcional ao padrão visual do vídeo: painéis arredondados
azul-escuros, chips amarelos de seleção, ícones coloridos, logo "Isle BUILDER",
e completar as telas que não aparecem abertas no vídeo (World, Map, Help).

## Entregável

Interface com paridade visual com o vídeo de referência (validada por
comparação lado a lado), incluindo toggle de esconder UI, settings, e as abas
World/Map/Help projetadas por inferência e aprovadas pelo usuário.

## Escopo

**Dentro:**
- Estilização completa de toda a UI, telas novas, atalhos visíveis, microinterações.

**Fora:**
- Novas mecânicas de jogo; responsivo mobile completo (só o básico de touch).

## Tarefas

- [x] Design tokens: paleta da UI (azul-escuro dos painéis, amarelo de seleção, verde/vermelho dos botões), cantos, sombras, tipografia Fredoka (`src/ui/styles.css`).
- [x] Logo "Isle BUILDER" com folhinhas — **procedural** em `src/ui/uiIcons.ts` (`createLogoElement`); substituir por PNG de IA conforme `assets/ART_PLAN.md`.
- [x] Toolbar esquerda final: 7 ferramentas com ícones pixel procedurais, estado ativo (borda amarela), tooltips com atalho, sliders SIZE/SPACE estilizados.
- [x] Top bar: Undo (azul), Redo (verde), Clear (vermelho) em pílulas.
- [x] Painel direito final: 6 abas coloridas (Land/Decor/Props/World/Map/Help), cabeçalho "CHOOSE A TERRAIN", cards de item com seleção amarela, grid com scroll suave.
- [x] Botões de sistema (topo direito): settings, pausa, toggle UI, screenshot (4º botão confirmado).
- [x] **Aba World**: sliders densidade, chips 0.5×/1×/2×, toggles espuma/repovoar, botão repovoar.
- [x] **Aba Map**: minimapa com retângulo viewport, clique para navegar, stats, centralizar na ilha (centroide), salvar PNG.
- [x] **Aba Help**: ferramentas + câmera/edição + versão.
- [x] Ícones pixel art procedurais na paleta do jogo (`src/ui/uiIcons.ts`) — **placeholder** até arte IA final.
- [x] Settings: volume (localStorage, prep Sprint 09), qualidade DPR (1/1.5/2), limpar mapa (`src/ui/settingsModal.ts`).
- [x] Toggle esconder UI (Tab) — zero elementos além do canvas.
- [x] Microinterações: hover/press nos botões, transição UI 200ms, cursor contextual por ferramenta (+ grabbing ao pan).
- [x] Scorecard visual: layout alinhado ao mockup aprovado; comparação qualitativa com vídeo (paridade estrutural, ícones finais pendentes de IA).

## Critérios de aceite

1. Comparação lado a lado com frames do vídeo: layout, cores e hierarquia
   equivalentes (checklist por elemento). ✅ Estrutura e paleta; ícones/logo finais na fase IA.
2. Toda ação é alcançável por mouse e tem atalho documentado no Help. ✅
3. UI escondida = zero elementos na tela além do canvas. ✅
4. Nenhum elemento de UI causa queda de frame ao abrir/rolar. ✅

## Riscos

- ~~As abas World/Map/Help são projetadas por inferência — obter aprovação do
  usuário antes de implementar.~~ **Resolvido em 2026-07-02: layout aprovado**
  (referência canônica: `mockups/ui-abas-mockup.html`).
- ~~O 4º botão do topo direito ainda não tem função confirmada~~ **Resolvido:**
  screenshot PNG sem UI.

## Arquivos principais

| Arquivo | Papel |
|---------|-------|
| `src/ui/uimanager.ts` | Orquestra UI, toggle Tab, settings, update minimapa |
| `src/ui/uiIcons.ts` | Ícones + logo procedurais (27 ícones) |
| `src/ui/settingsModal.ts` | Volume, DPR, reset mapa |
| `src/ui/maptab.ts` | Minimapa + viewport + clique |
| `src/world/landBounds.ts` | Centroide ilha, contagem ilhas |
| `src/ui/styles.css` | Design tokens e modal |

## Validação (2026-07-02)

- **52 testes** Vitest passando (+3 em `landBounds.test.ts`)
- **`npm run build`** verde
- Minimapa: retângulo amarelo do viewport atualiza em tempo real na aba Map
- Centralizar: usa centroide dos tiles de terra, não (0,0)
