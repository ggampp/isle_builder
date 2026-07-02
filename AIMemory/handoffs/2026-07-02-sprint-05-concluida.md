# Handoff — Sprint 05 (Arte e props)

- **Data:** 2026-07-02T19:05Z
- **Agente:** Cursor (Composer)
- **Estado:** Sprint 05 concluída; build/testes verdes; Sprint 06 não iniciada

## O que foi implementado

### Arte (`assets/style-guide.md`, `render/art/`)
- Paleta unificada Stardew-inspired documentada.
- `terrainAtlas.ts`: blob atlas final com dither (substitui cores chapadas do placeholder).
- `propsAtlas.ts`: 53 sprites procedurais em atlas 8×N, nearest filter.

### Catálogo e props (`props/`)
- `props.json` + `catalog.ts`: 53 props data-driven (decor, vegetation, utility, building).
- `propmap.ts`: armazenamento com footprint espacial.
- `placement.ts`: validação (walkable, overlap), `propSortY`.
- `propplacement.ts`: colocador com scatter (SPACE), integrado ao histórico.

### Render (`render/proprenderer.ts`, `proppreviewrenderer.ts`)
- Y-sort via `renderOrder` crescente por base Y.
- Sombras elípticas sob cada prop.
- Preview fantasma verde/vermelho.

### UI (`ui/sidepanel.ts`)
- Painel direito com abas **Land** (ferramentas de terreno), **Decor** (scatter), **Props** (catálogo).
- Grid rolável com thumbnails do atlas.

### Histórico (`tools/history.ts`)
- `PropStrokeCommand` + `CompositeCommand` para strokes mistos terreno+prop.
- `ClearCommand` agora salva/restaura props também.

## Critérios de aceite

| # | Status | Notas |
|---|--------|-------|
| 1 | OK | 53 props + terreno com mesma paleta; validação visual manual recomendada |
| 2 | OK | y-sort em `PropRenderer.rebuildAll` |
| 3 | OK | Teste `history.test.ts` prop undo/redo |
| 4 | OK | Grid DOM com scroll; 53 itens |

## Próximo passo

**Sprint 06 (Simulação viva)** — ler `sprints/SPRINT_06_simulacao.md`. Aldeões precisam respeitar `isWalkableLayer()` e pontes.

## Avisos

- Arte é procedural (canvas), não gerada via `threejs-image-generator` — consistente mas menos detalhada que pixel art hand-drawn. Sprint 07 pode refinar visual dos painéis.
- `SidePanel` substitui o `TerrainPanel` standalone (agora embutido na aba Land).
- Remoção de props: clique-direito (não há modo borracha dedicado na UI, mas funcional).
- Nenhum commit git foi feito nesta sessão.
