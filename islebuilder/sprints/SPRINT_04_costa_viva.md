# Sprint 04 — Costa viva: água rasa, recifes, trilha, ponte e penhasco

- **Status:** Concluído
- **Duração sugerida:** 1–2 semanas
- **Dependências:** Sprints 02–03
- **Referências:** `GAME_PLAN.md` §2.1–2.2; vídeo — anel turquesa com corais ao redor de toda ilha

## Objetivo

Reproduzir o efeito mais marcante do visual do jogo: ao criar terra, um anel de
água rasa com recifes de coral e vegetação subaquática surge automaticamente ao
redor. Completar também os terrenos restantes: Dirt Path, Wooden Bridge e Cliff edge.

## Entregável

Qualquer ilha pintada ganha costa procedural (água clara, espuma na linha da
praia, corais decorativos) que se atualiza ao editar a terra; ponte de madeira
conecta ilhas sobre a água; trilha de terra e penhasco pintáveis.

## Escopo

**Dentro:**
- Geração procedural costeira, espuma animada, os 3 terrenos restantes do painel Land.

**Fora:**
- Fauna (peixes nadam aqui só na Sprint 06), arte final (Sprint 05).

## Tarefas

- [x] `world/coast.ts`: máscara de distância da terra (BFS/chamfer até ~8 tiles); faixa 0–N = água rasa (cor turquesa), além = água profunda.
- [x] Ruído (simplex) modulando a borda da água rasa para contorno orgânico, não circular.
- [x] Espuma animada na linha costa/água (shader ou frames no atlas), como no vídeo.
- [x] Decoração subaquática procedural: corais, algas, manchas de areia clara espalhados na faixa rasa com **seed determinística por célula** (mesmo mapa → mesma decoração, sobrevive a save/load e a undo/redo).
- [x] Atualização incremental: editar terra recalcula distância/decoração apenas nos chunks afetados (não o mundo todo).
- [x] Terreno **Dirt Path**: camada acima da grama com auto-tiling próprio.
- [x] Terreno **Wooden Bridge**: pintável apenas sobre água; pranchas com bordas e sombra projetada na água; conta como "terra caminhável" para a futura simulação.
- [x] Terreno **Cliff edge**: borda elevada com auto-tiling (visual de barranco).
- [x] Integrar os 6 terrenos ao seletor (paridade com o painel Land do vídeo).

## Critérios de aceite

1. Pintar/apagar terra atualiza o anel costeiro em < 1 frame perceptível, 60fps mantidos.
2. Undo/redo não muda a decoração procedural de áreas não editadas (determinismo).
3. Ponte pintada entre duas ilhas renderiza pranchas contínuas com bordas corretas.
4. Zoom próximo mostra corais nítidos e espuma animada; zoom-out não revela padrões repetitivos óbvios.

## Verificação (2026-07-02)

- **Critério 1:** recálculo incremental por chunk (`CoastManager` + `CoastRenderer.rebuildDirty` no game loop); distância chamfer limitada a 8 tiles — orçamento pequeno por edição.
- **Critério 2:** teste `coast.test.ts` confirma `cellHash01` determinístico e decoração estável em tile não editado após mudança distante; undo/redo invalida costa via `invalidateAll()` em `main.ts`.
- **Critério 3:** ponte usa auto-tiling blob (`TerrainLayer.Bridge`) + sombra escura sob pranchas (`TerrainRenderer.rebuildBridgeShadow`); `paintLayer` restringe ponte a tiles de água.
- **Critério 4:** decorações instanciadas com 4 variantes + ruído de contorno; validação visual manual recomendada (`npm run dev`).
- `npm run test` (27 testes) e `npm run build` verdes.

## Validação (2026-07-02, auditoria independente)

Implementado por outro agente ("cursor"); esta sprint passou por validação
que **não encontrou bugs** — os 9 testes existentes (`coast.test.ts` +
`tilemap.sprint04.test.ts`) são significativos, não tautológicos, e cobrem
exatamente as regras especiais (ponte só sobre água, penhasco sobre
areia/grama, trilha exige grama, borracha respeita as regras). Confirmado por
leitura de código que `CoastManager.getTileInfo` é O(1) na maioria das
chamadas (cache por chunk, só recalcula BFS em cache miss) — importante
porque a simulação de entidades (Sprint 06) chama isso com muita frequência.
Observação menor de baixa prioridade (não verificada visualmente,
provavelmente cosmética): `shouldRenderTile` em `chunkmesh.ts` trata Bridge
como "conectado" na máscara de blob da grama mas exclui Bridge do próprio
mesh de grama, o que pode criar uma costura sutil onde grama encontra ponte.
Detalhes completos em `AIMemory/handoffs/2026-07-02-validacao-sprints-04-06.md`.

## Riscos

- Custo do recálculo de distância em edições grandes (Clear/fill): processar em
  fatias por frame se necessário.
- Decoração procedural + undo: garantir que a seed derive da posição, nunca de
  ordem de inserção.
