# Handoff — Sprint 04 (Costa viva)

- **Data:** 2026-07-02T19:00Z
- **Agente:** Cursor (Composer)
- **Estado:** Sprint 04 concluída; build/testes verdes; Sprint 05 não iniciada

## O que foi implementado

### Costa procedural (`world/coast.ts` + `render/coastrenderer.ts`)
- Distância chamfer 3-4 até terra (`isLandLayer`), limitada a 8 tiles.
- Faixa de água rasa modulada por ruído (`coastNoise`) para contorno orgânico.
- Espuma animada (shader) na linha praia/água (tiles rasos adjacentes a areia).
- Decorações subaquáticas determinísticas por célula (`cellHash01`): coral rosa/laranja, algas, manchas de areia.
- `CoastManager`: recálculo incremental por chunk ao editar terra; cache por chunk.
- `CoastRenderer`: meshes de água rasa + espuma + `InstancedMesh` de decorações.

### Novos terrenos (`world/layers.ts`, `tilemap.ts`, `terrainrenderer.ts`)
- **Path (3):** sobre grama, auto-tiling próprio.
- **Bridge (4):** só sobre água; auto-tiling blob; sombra projetada na água; `isWalkableLayer()` para simulação futura.
- **Cliff (5):** sobre areia/grama; auto-tiling de penhasco.
- `paintLayer` / `eraseLayer` com regras especiais; `bucket.ts` atualizado para ponte/penhasco.
- `chunkmesh.ts`: filtro `shouldRenderTile` evita ponte aparecer nos meshes de areia/grama.

### Integração (`main.ts`, `ui/terrainpanel.ts`)
- Painel com 6 terrenos (water/sand/grass/path/bridge/cliff).
- Callback encadeado `onTileChanged` (histórico + costa).
- `invalidateAll()` após undo/redo/clear para manter costa consistente.
- Ordem de render: Ocean → Coast (rasa/espuma/deco) → Terreno → Preview (`renderOrder` 6).

### Testes
- `coast.test.ts` (5 casos): determinismo, distância, ponte sem água rasa.
- `tilemap.sprint04.test.ts` (4 casos): regras path/bridge/cliff/borracha.
- Total: **27 testes**, `npm run build` verde.

## Critérios de aceite

| # | Status | Como verificado |
|---|--------|-----------------|
| 1 | OK | Recálculo incremental por chunk no loop; distância limitada a 8 tiles |
| 2 | OK | `cellHash01` por posição; teste de decoração estável; undo invalida costa |
| 3 | OK | Auto-tiling blob + sombra sob ponte; ponte só em água |
| 4 | Parcial | Decorações + espuma animada implementadas; validação visual manual recomendada (`npm run dev`) |

## Dívida técnica herdada (Sprint 03 — não resolvida)

1. Hand tool não move a câmera (no-op além de bloquear pintura).
2. Feedback de estouro do balde só `console.warn`.
3. Sem testes unitários para line/rect/bucket.

Nenhum bloqueia a Sprint 05.

## Próximo passo

**Sprint 05 (Arte e props)** — ler `sprints/SPRINT_05_arte_props.md`. Substituir atlas placeholder por arte pixel final e implementar catálogo de props colocáveis.

## Avisos

- `invalidateAll()` em undo/redo recalcula toda a costa — correto mas pode ser otimizado para diffs regionais se performance cair em mapas grandes.
- Ponte não recebe água rasa nem decoração (intencional).
- Nenhum commit git foi feito nesta sessão.
